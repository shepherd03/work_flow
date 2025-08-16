import type {
    Workflow,
    Node,
    Edge,
    ExecutionContext,
    WorkflowExecutionContext,
    NodeExecutionResult,
    NodeTemplate
} from '../types/workflow';
import { nodeRegistry } from './NodeRegistry';

/**
 * 工作流执行引擎
 * 负责管理工作流的执行过程，确保节点间的数据传递
 */
export class WorkflowExecutor {
    private workflowContext: WorkflowExecutionContext;

    constructor(workflowId: string) {
        this.workflowContext = {
            workflowId,
            startTime: Date.now(),
            nodeResults: new Map(),
            globalVariables: {}
        };
    }

    /**
     * 执行整个工作流
     */
    async executeWorkflow(workflow: Workflow): Promise<{
        success: boolean;
        results: Record<string, NodeExecutionResult>;
        finalOutput?: any;
        error?: string;
    }> {
        try {
            // 1. 验证工作流结构
            const validationResult = this.validateWorkflow(workflow);
            if (!validationResult.valid) {
                throw new Error(validationResult.error);
            }

            // 2. 构建执行顺序
            const executionOrder = this.buildExecutionOrder(workflow.nodes, workflow.edges);

            console.log('工作流执行顺序:', executionOrder.map(n => `${n.id}(${n.type})`));

            // 3. 按顺序执行节点
            let finalOutput: any = null;
            for (const node of executionOrder) {
                const result = await this.executeNode(node, workflow.edges);

                if (!result.success) {
                    throw new Error(`节点 ${node.id} 执行失败: ${result.error}`);
                }

                // 如果是结束节点，保存最终输出
                if (node.type === 'workflow-end') {
                    finalOutput = result.outputs.finalOutput;
                }
            }

            return {
                success: true,
                results: Object.fromEntries(this.workflowContext.nodeResults),
                finalOutput
            };

        } catch (error) {
            console.error('工作流执行失败:', error);
            return {
                success: false,
                results: Object.fromEntries(this.workflowContext.nodeResults),
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }

    /**
     * 执行单个节点
     */
    private async executeNode(node: Node<any>, edges: Edge[]): Promise<NodeExecutionResult> {
        const template = nodeRegistry.get(node.type);
        if (!template) {
            throw new Error(`未找到节点类型模板: ${node.type}`);
        }

        const startTime = Date.now();

        try {
            // 1. 获取输入数据
            const inputs = this.getNodeInputs(node, edges);

            // 2. 创建执行上下文
            const executionContext = this.createExecutionContext(node.id, edges);

            // 3. 执行节点
            console.log(`执行节点 ${node.id}(${node.type})，输入数据:`, inputs);
            const outputs = await template.execute(inputs, node.data, executionContext);

            // 4. 保存执行结果
            const result: NodeExecutionResult = {
                nodeId: node.id,
                nodeType: node.type,
                timestamp: startTime,
                success: true,
                outputs
            };

            this.workflowContext.nodeResults.set(node.id, result);
            console.log(`节点 ${node.id} 执行完成，输出:`, outputs);

            return result;

        } catch (error) {
            const result: NodeExecutionResult = {
                nodeId: node.id,
                nodeType: node.type,
                timestamp: startTime,
                success: false,
                outputs: {},
                error: error instanceof Error ? error.message : '执行失败'
            };

            this.workflowContext.nodeResults.set(node.id, result);
            return result;
        }
    }

    /**
 * 获取节点的输入数据
 * 被连接的节点可以直接使用连接它的节点的所有输出数据
 */
    private getNodeInputs(node: Node<any>, edges: Edge[]): Record<string, any> {
        // 找到所有连接到当前节点的边
        const incomingEdges = edges.filter(edge => edge.target === node.id);

        if (incomingEdges.length === 0) {
            // 没有输入连接，返回空对象（适用于开始节点）
            return {};
        }

        // 合并所有上游节点的输出数据
        const inputs: Record<string, any> = {};

        for (const edge of incomingEdges) {
            const sourceResult = this.workflowContext.nodeResults.get(edge.source);
            if (sourceResult && sourceResult.success) {
                // 将上游节点的所有输出数据都传递给下游节点
                Object.entries(sourceResult.outputs).forEach(([key, value]) => {
                    // 如果是主要输出，使用 input 作为key
                    if (key === 'output') {
                        inputs['input'] = value;
                    }
                    // 同时保留原始key，让节点可以访问上游节点的所有数据
                    inputs[key] = value;
                });

                // 为了向后兼容，也使用 edge 的 handle 映射
                const outputKey = edge.sourceHandle || 'output';
                const inputKey = edge.targetHandle || 'input';

                if (sourceResult.outputs[outputKey] !== undefined) {
                    inputs[inputKey] = sourceResult.outputs[outputKey];
                }
            }
        }

        return inputs;
    }

    /**
     * 创建节点执行上下文
     */
    private createExecutionContext(nodeId: string, edges: Edge[]): ExecutionContext {
        return {
            workflowId: this.workflowContext.workflowId,
            nodeId: nodeId,
            variables: { ...this.workflowContext.globalVariables },
            workflowContext: this.workflowContext,

            // 获取指定上游节点的数据
            getUpstreamData: (upstreamNodeId: string) => {
                const result = this.workflowContext.nodeResults.get(upstreamNodeId);
                return result && result.success ? result.outputs : null;
            },

            // 获取所有上游节点的数据
            getAllUpstreamData: () => {
                const upstreamNodeIds = this.getUpstreamNodeIds(nodeId, edges);
                const allData: Record<string, Record<string, any>> = {};

                upstreamNodeIds.forEach(upstreamId => {
                    const result = this.workflowContext.nodeResults.get(upstreamId);
                    if (result && result.success) {
                        allData[upstreamId] = result.outputs;
                    }
                });

                return allData;
            },

            // 根据节点类型获取上游数据
            getUpstreamDataByType: (nodeType: string) => {
                const results: Record<string, any>[] = [];
                this.workflowContext.nodeResults.forEach((result) => {
                    if (result.nodeType === nodeType && result.success) {
                        results.push(result.outputs);
                    }
                });
                return results;
            },

            logger: {
                info: (msg) => console.log(`[${nodeId}] INFO: ${msg}`),
                warn: (msg) => console.warn(`[${nodeId}] WARN: ${msg}`),
                error: (msg) => console.error(`[${nodeId}] ERROR: ${msg}`)
            }
        };
    }

    /**
     * 获取指定节点的上游节点ID列表
     */
    private getUpstreamNodeIds(nodeId: string, edges: Edge[]): string[] {
        return edges
            .filter(edge => edge.target === nodeId)
            .map(edge => edge.source);
    }

    /**
     * 验证工作流结构
     */
    private validateWorkflow(workflow: Workflow): { valid: boolean; error?: string } {
        // 1. 检查是否有开始节点
        const startNodes = workflow.nodes.filter(node => node.type === 'workflow-start');
        if (startNodes.length === 0) {
            return { valid: false, error: '工作流必须包含一个开始节点' };
        }
        if (startNodes.length > 1) {
            return { valid: false, error: '工作流只能有一个开始节点' };
        }

        // 2. 检查是否有结束节点
        const endNodes = workflow.nodes.filter(node => node.type === 'workflow-end');
        if (endNodes.length === 0) {
            return { valid: false, error: '工作流必须包含一个结束节点' };
        }
        if (endNodes.length > 1) {
            return { valid: false, error: '工作流只能有一个结束节点' };
        }

        // 3. 检查是否存在循环
        if (this.hasCycles(workflow.nodes, workflow.edges)) {
            return { valid: false, error: '工作流不能包含循环连接' };
        }

        // 4. 检查所有节点是否可达
        const reachableNodes = this.getReachableNodes(startNodes[0], workflow.edges);
        const unreachableNodes = workflow.nodes.filter(node => !reachableNodes.has(node.id));
        if (unreachableNodes.length > 0) {
            return {
                valid: false,
                error: `存在不可达的节点: ${unreachableNodes.map(n => n.id).join(', ')}`
            };
        }

        return { valid: true };
    }

    /**
     * 构建节点执行顺序（拓扑排序）
     */
    private buildExecutionOrder(nodes: Node<any>[], edges: Edge[]): Node<any>[] {
        const adjacencyList = new Map<string, string[]>();
        const inDegree = new Map<string, number>();

        // 初始化
        nodes.forEach(node => {
            adjacencyList.set(node.id, []);
            inDegree.set(node.id, 0);
        });

        // 构建邻接表和入度计算
        edges.forEach(edge => {
            const sourceList = adjacencyList.get(edge.source) || [];
            sourceList.push(edge.target);
            adjacencyList.set(edge.source, sourceList);

            const targetInDegree = inDegree.get(edge.target) || 0;
            inDegree.set(edge.target, targetInDegree + 1);
        });

        // 拓扑排序
        const queue: string[] = [];
        const result: Node<any>[] = [];

        // 找到所有入度为0的节点
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) {
                queue.push(nodeId);
            }
        });

        while (queue.length > 0) {
            const currentNodeId = queue.shift()!;
            const currentNode = nodes.find(n => n.id === currentNodeId);
            if (currentNode) {
                result.push(currentNode);
            }

            // 处理当前节点的邻接节点
            const neighbors = adjacencyList.get(currentNodeId) || [];
            neighbors.forEach(neighborId => {
                const newInDegree = (inDegree.get(neighborId) || 0) - 1;
                inDegree.set(neighborId, newInDegree);

                if (newInDegree === 0) {
                    queue.push(neighborId);
                }
            });
        }

        return result;
    }

    /**
     * 检查是否存在循环
     */
    private hasCycles(nodes: Node<any>[], edges: Edge[]): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const adjacencyList = new Map<string, string[]>();

        // 构建邻接表
        nodes.forEach(node => adjacencyList.set(node.id, []));
        edges.forEach(edge => {
            const list = adjacencyList.get(edge.source) || [];
            list.push(edge.target);
            adjacencyList.set(edge.source, list);
        });

        const dfs = (nodeId: string): boolean => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const neighbors = adjacencyList.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (dfs(neighbor)) return true;
                } else if (recursionStack.has(neighbor)) {
                    return true; // 发现后向边，存在循环
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        for (const node of nodes) {
            if (!visited.has(node.id)) {
                if (dfs(node.id)) return true;
            }
        }

        return false;
    }

    /**
     * 获取从起始节点可达的所有节点
     */
    private getReachableNodes(startNode: Node<any>, edges: Edge[]): Set<string> {
        const reachable = new Set<string>();
        const queue = [startNode.id];
        const adjacencyList = new Map<string, string[]>();

        // 构建邻接表
        edges.forEach(edge => {
            const list = adjacencyList.get(edge.source) || [];
            list.push(edge.target);
            adjacencyList.set(edge.source, list);
        });

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (reachable.has(currentId)) continue;

            reachable.add(currentId);
            const neighbors = adjacencyList.get(currentId) || [];
            neighbors.forEach(neighbor => {
                if (!reachable.has(neighbor)) {
                    queue.push(neighbor);
                }
            });
        }

        return reachable;
    }

    /**
     * 获取执行结果
     */
    getExecutionResults(): Record<string, NodeExecutionResult> {
        return Object.fromEntries(this.workflowContext.nodeResults);
    }

    /**
     * 重置执行状态
     */
    reset(): void {
        this.workflowContext.nodeResults.clear();
        this.workflowContext.globalVariables = {};
        this.workflowContext.startTime = Date.now();
    }
}
