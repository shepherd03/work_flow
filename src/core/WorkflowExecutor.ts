import type {
    Workflow,
    Node,
    Edge,
    ExecutionContext,
    WorkflowExecutionContext,
    NodeExecutionResult
} from '../types/workflow';
import { nodeRegistry } from './NodeRegistry';

/**
 * 工作流执行引擎
 * 负责管理工作流的执行过程，确保节点间的数据传递
 */
export class WorkflowExecutor {
    private workflowContext: WorkflowExecutionContext;
    private currentWorkflow?: Workflow;

    constructor(workflowId: string) {
        this.workflowContext = {
            workflowId,
            startTime: Date.now(),
            nodeResults: new Map(),
            globalVariables: {}
        };
    }

    /**
     * 获取当前工作流的节点列表
     */
    private getCurrentWorkflowNodes(): Node<any>[] {
        return this.currentWorkflow?.nodes || [];
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
            // 设置当前工作流引用
            this.currentWorkflow = workflow;

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
     * 简化的节点输入数据获取（基于单父节点架构）
     * 直接从父节点获取输出数据，根据参数选择配置进行数据映射
     */
    private getNodeInputs(node: Node<any>, _edges: Edge[]): Record<string, any> {
        const inputs: Record<string, any> = {};
        const nodeAny = node as any;

        // 如果没有父节点，返回空输入（开始节点等）
        if (!nodeAny.parentNode) {
            return inputs;
        }

        // 获取父节点的执行结果
        const parentResult = this.workflowContext.nodeResults.get(nodeAny.parentNode);
        if (!parentResult || !parentResult.success) {
            console.warn(`父节点 ${nodeAny.parentNode} 的执行结果不可用`);
            return inputs;
        }

        // 检查是否是循环体节点，需要特殊处理循环上下文
        if (nodeAny.isLoopBodyNode && nodeAny.loopContext) {
            // 循环体节点：提供循环上下文数据
            inputs.element = nodeAny.loopContext.element;
            inputs.index = nodeAny.loopContext.index;
            inputs.array = nodeAny.loopContext.array;
            inputs.loopNodeId = nodeAny.loopContext.loopNodeId;

            // 同时提供element作为默认输入
            inputs.input = nodeAny.loopContext.element;
            inputs.inputArray = [nodeAny.loopContext.element]; // 单元素数组
        } else {
            // 常规节点：根据参数选择配置映射数据
            const parameterSelections = node.data?.parameterSelections;
            if (parameterSelections) {
                // 有参数选择配置，精确映射每个参数
                Object.entries(parameterSelections).forEach(([paramKey, selection]: [string, any]) => {
                    if (selection.source === 'upstream' && selection.sourceNodeId === nodeAny.parentNode) {
                        const outputKey = selection.sourceOutputKey || 'output';
                        const outputValue = parentResult.outputs[outputKey];
                        if (outputValue !== undefined) {
                            inputs[paramKey] = outputValue;
                        }
                    }
                });
            } else {
                // 没有参数选择配置，使用默认映射
                // 将父节点的主要输出映射为当前节点的输入
                if (parentResult.outputs.output !== undefined) {
                    inputs.input = parentResult.outputs.output;
                    inputs.inputArray = parentResult.outputs.output; // 为循环节点兼容
                }

                // 同时提供所有父节点的输出数据以供访问
                Object.entries(parentResult.outputs).forEach(([key, value]) => {
                    inputs[key] = value;
                });
            }
        }

        console.log(`节点 ${node.id} 从父节点 ${nodeAny.parentNode} 获取输入数据:`, inputs);
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

            // 循环体分支相关方法
            getLoopBodyNode: async (loopNodeId: string) => {
                // 在当前工作流中查找指定循环节点的循环体子节点
                const allNodes = this.getCurrentWorkflowNodes();
                const loopNode = allNodes.find(n => n.id === loopNodeId) as any;
                if (!loopNode?.loopBodyNode) {
                    return null;
                }
                return allNodes.find(n => n.id === loopNode.loopBodyNode) || null;
            },

            executeLoopBody: async (loopNodeId: string, loopBodyNode: Node<any>, element: any, index: number, array: any[]) => {
                return await this.executeLoopBody(
                    this.getCurrentWorkflowNodes().find(n => n.id === loopNodeId) as Node<any>,
                    loopBodyNode,
                    element,
                    index,
                    array
                );
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
     * 执行循环体分支
     * @param loopNode 循环节点
     * @param loopBodyNode 循环体子节点
     * @param element 当前循环元素
     * @param index 当前索引
     * @param array 整个数组
     */
    async executeLoopBody(
        loopNode: Node<any>,
        loopBodyNode: Node<any>,
        element: any,
        index: number,
        array: any[]
    ): Promise<any> {
        // 创建循环上下文
        const loopContext = {
            element,
            index,
            array,
            loopNodeId: loopNode.id
        };

        // 为循环体节点设置循环上下文
        const loopBodyNodeWithContext = {
            ...loopBodyNode,
            loopContext,
            isLoopBodyNode: true
        } as any;

        console.log(`执行循环体分支，element: ${JSON.stringify(element)}, index: ${index}`);

        try {
            // 执行循环体节点
            const result = await this.executeNode(loopBodyNodeWithContext, []);

            if (!result.success) {
                throw new Error(`循环体执行失败: ${result.error}`);
            }

            // 返回循环体的输出
            return result.outputs.output || result.outputs;

        } catch (error) {
            console.error(`循环体分支执行失败:`, error);
            throw error;
        }
    }

    /**
     * 简化的执行顺序构建（基于单父节点架构）
     * 由于每个节点最多有一个父节点，可以直接构建执行链
     */
    private buildExecutionOrder(nodes: Node<any>[], _edges: Edge[]): Node<any>[] {
        const result: Node<any>[] = [];
        const processed = new Set<string>();

        // 辅助函数：递归构建从指定节点开始的执行链
        const buildChainFromNode = (nodeId: string): void => {
            if (processed.has(nodeId)) {
                return; // 避免重复处理
            }

            const node = nodes.find(n => n.id === nodeId) as any;
            if (!node) {
                return;
            }

            // 先处理父节点（如果有的话）
            if (node.parentNode && !processed.has(node.parentNode)) {
                buildChainFromNode(node.parentNode);
            }

            // 然后处理当前节点
            if (!processed.has(nodeId)) {
                result.push(node);
                processed.add(nodeId);
            }
        };

        // 找到所有根节点（没有父节点的节点）
        const rootNodes = nodes.filter(node => !(node as any).parentNode);

        // 从每个根节点开始构建执行链
        for (const rootNode of rootNodes) {
            buildChainFromNode(rootNode.id);
        }

        // 处理可能遗漏的节点（有父节点但父节点不在当前工作流中的情况）
        for (const node of nodes) {
            if (!processed.has(node.id)) {
                buildChainFromNode(node.id);
            }
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
