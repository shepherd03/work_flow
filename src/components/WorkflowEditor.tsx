import React, { useCallback, useState, useRef, useEffect, useMemo, useTransition } from 'react';
import ReactFlow, {
    addEdge,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
} from 'reactflow';
import type {
    Node,
    NodeTypes,
    OnConnect,
    OnConnectEnd,
    ReactFlowInstance,
    Connection,
} from 'reactflow';
import { Layout, Button, Space, Typography, App } from 'antd';
import { SaveOutlined, PlayCircleOutlined } from '@ant-design/icons';
import 'reactflow/dist/style.css';
import type { Workflow, NodeTemplate, PortConnectionRuleResult } from '../types/workflow';
import NodePalette from './editor/NodePalette';
import ContextMenu from './editor/ContextMenu';
import MetadataModal from './editor/MetadataModal';
import { DefaultNode } from './default/DefaultNode';

import { nodeRegistry } from '../core/NodeRegistry';
import {
    stringDataTemplate,
    numberDataTemplate,
    booleanDataTemplate,
    arrayDataTemplate,
    objectDataTemplate
} from '../nodeTemplates/DataNodeTemplate';
import { generateNodeIdByNodeInfo } from '../utils/nodeUtils';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

interface WorkflowEditorProps {
    workflow?: Workflow;
    onWorkflowChange?: (workflow: Workflow) => void;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
    workflow,
    onWorkflowChange,
}) => {
    const { message } = App.useApp();
    const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || []);

    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        show: boolean;
        x: number;
        y: number;
        nodeId?: string;
    }>({ show: false, x: 0, y: 0 });

    const [metadataModal, setMetadataModal] = useState<{
        visible: boolean;
        nodeData?: any;
    }>({ visible: false });

    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // 添加注册状态跟踪，确保 nodeTypes 在节点注册后重新计算
    const [nodeTypesReady, setNodeTypesReady] = useState<boolean>(false);

    // 使用 useTransition 优化状态更新性能
    const [isPending, startTransition] = useTransition();

    // 默认连接验证函数
    const defaultConnectionValidation = (sourcePort: any, targetPort: any): { allowed: boolean; message?: string } => {
        // 1. 不能自己连自己
        if (sourcePort.id === targetPort.id) {
            return { allowed: false, message: '不能连接到自己' };
        }

        // 2. 只能输入连输出，或输出连接输入
        const sourceIsOutput = sourcePort.type === 'output';
        const targetIsInput = targetPort.type === 'input';

        if (!(sourceIsOutput && targetIsInput)) {
            return { allowed: false, message: '只能从输出端口连接到输入端口' };
        }

        // 3. 输入输出类型必须相同
        if (sourcePort.dataType !== targetPort.dataType) {
            return { allowed: false, message: `类型不匹配：${sourcePort.dataType ?? 'unknown'} 不能连接到 ${targetPort.dataType ?? 'unknown'}` };
        }

        return { allowed: true };
    };
    const nodeTypes = useMemo(() => {
        const types: NodeTypes = {};

        // 获取所有注册的节点模板
        const templates = nodeRegistry.getAll();

        templates.forEach(template => {
            // 使用 useCallback 优化节点渲染函数，避免每次重新创建
            types[template.metadata.type] = React.memo((props: any) => {
                const { data, selected } = props;
                const nodeData = data;

                // 如果模板定义了自定义渲染函数，使用它
                if (template.renderInEditor) {
                    const onDataChange = useCallback((newData: any) => {
                        // 使用 startTransition 优化状态更新性能
                        startTransition(() => {
                            setNodes((nds) =>
                                nds.map((n) =>
                                    n.id === props.id
                                        ? { ...n, data: { ...n.data, ...newData } }
                                        : n
                                )
                            );
                        });

                        // 触发更新钩子
                        if (template.hooks?.onUpdated) {
                            template.hooks.onUpdated(props.id, nodeData, { ...nodeData, ...newData });
                        }
                    }, [props.id, nodeData, template.hooks, startTransition]);

                    return template.renderInEditor(nodeData, selected, onDataChange, template.metadata);
                }

                // 默认渲染
                const ports = template.getPorts(nodeData);
                return (
                    <DefaultNode
                        nodeData={nodeData}
                        isSelected={selected}
                        onDataChange={useCallback((newData) => {
                            startTransition(() => {
                                setNodes((nds) =>
                                    nds.map((n) =>
                                        n.id === props.id
                                            ? { ...n, data: { ...n.data, ...newData } }
                                            : n
                                    )
                                );
                            });
                        }, [props.id, startTransition])}
                        metadata={template.metadata}
                        inputPort={ports.input}
                        outputPort={ports.output}
                    />
                );
            });
        });

        return types;
    }, [setNodes, nodeTypesReady]); // 添加 nodeTypesReady 作为依赖项

    const validateConnection = useCallback((connection: Connection): PortConnectionRuleResult => {
        if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
            return { allowed: false, message: '连接参数不完整' };
        }

        // 获取源节点和目标节点
        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode = nodes.find(node => node.id === connection.target);

        if (!sourceNode || !targetNode) {
            return { allowed: false, message: '源节点或目标节点不存在' };
        }

        // 获取节点模板
        const sourceTemplate = nodeRegistry.get(sourceNode.type);
        const targetTemplate = nodeRegistry.get(targetNode.type);

        if (!sourceTemplate || !targetTemplate) {
            return { allowed: false, message: '源节点或目标节点模板不存在' };
        }

        // 获取端口信息
        const sourcePorts = sourceTemplate.getPorts(sourceNode.data);
        const targetPorts = targetTemplate.getPorts(targetNode.data);

        // 找到对应的端口
        const sourcePort = sourcePorts.output;
        const targetPort = targetPorts.input;

        if (!sourcePort || !targetPort) {
            return { allowed: false, message: '源端口或目标端口不存在' };
        }

        // 构建端口对象，包含类型信息
        const sourcePortWithType = { ...sourcePort, type: 'output' };
        const targetPortWithType = { ...targetPort, type: 'input' };

        // 首先检查源端口的自定义验证规则
        if (sourcePort.connectionRules?.customValidation) {
            const customResult = sourcePort.connectionRules.customValidation(sourcePortWithType, targetPortWithType);
            return customResult;
        }

        // 检查源端口的允许/禁止数据类型规则
        if (sourcePort.connectionRules?.allowedDataTypes &&
            targetPort.dataType &&
            !sourcePort.connectionRules.allowedDataTypes.includes(targetPort.dataType)) {
            return { allowed: false, message: `源端口不允许连接到 ${targetPort.dataType} 类型` };
        }

        if (sourcePort.connectionRules?.disallowedDataTypes &&
            targetPort.dataType &&
            sourcePort.connectionRules.disallowedDataTypes.includes(targetPort.dataType)) {
            return { allowed: false, message: `源端口禁止连接到 ${targetPort.dataType} 类型` };
        }

        // 检查目标端口的自定义验证规则
        if (targetPort.connectionRules?.customValidation) {
            const customResult = targetPort.connectionRules.customValidation(sourcePortWithType, targetPortWithType);
            return customResult;
        }

        // 检查目标端口的允许/禁止数据类型规则
        if (targetPort.connectionRules?.allowedDataTypes &&
            sourcePort.dataType &&
            !targetPort.connectionRules.allowedDataTypes.includes(sourcePort.dataType)) {
            return { allowed: false, message: `目标端口不允许接受 ${sourcePort.dataType} 类型` };
        }

        if (targetPort.connectionRules?.disallowedDataTypes &&
            sourcePort.dataType &&
            targetPort.connectionRules.disallowedDataTypes.includes(sourcePort.dataType)) {
            return { allowed: false, message: `目标端口禁止接受 ${sourcePort.dataType} 类型` };
        }

        // 使用默认验证规则
        const defaultResult = defaultConnectionValidation(sourcePortWithType, targetPortWithType);
        return defaultResult;
    }, [nodes]);

    // 使用 useRef 跟踪已显示的错误，防止重复弹出
    const shownErrorRef = useRef<string>('');

    // 为 ReactFlow 提供的包装函数
    const isValidConnection = useCallback((connection: Connection): boolean => {
        const result = validateConnection(connection);
        if (!result.allowed) {
            // 获取源节点和目标节点
            const sourceNode = nodes.find(node => node.id === connection.source);
            const targetNode = nodes.find(node => node.id === connection.target);

            if (sourceNode && targetNode) {
                // 使用节点ID和错误消息生成唯一键
                const errorKey = `${sourceNode.id}-${targetNode.id}-${result.message}`;

                // 检查是否已经显示过这个错误
                if (shownErrorRef.current !== errorKey) {
                    message.error(result.message || '连接验证失败');
                    shownErrorRef.current = errorKey;
                }
            } else {
                // 如果找不到节点，仍然显示错误
                message.error(result.message || '连接验证失败');
            }
        }
        return result.allowed;
    }, [validateConnection, nodes]);


    // 初始化节点注册表 - 修复重复注册问题
    useEffect(() => {
        // 使用批量注册方法，自动处理重复注册
        const templates: NodeTemplate<any>[] = [
            stringDataTemplate,
            numberDataTemplate,
            booleanDataTemplate,
            arrayDataTemplate,
            objectDataTemplate,
        ];

        // 注册节点模板
        nodeRegistry.registerBatch(templates);

        // 确保在下一个事件循环中设置状态，避免同步更新问题
        setTimeout(() => {
            setNodeTypesReady(true);
        }, 0);

        // 添加事件监听器
        const eventListener = (event: any) => {
            console.log('节点事件:', event);
        };
        nodeRegistry.addEventListener(eventListener);

        return () => {
            nodeRegistry.removeEventListener(eventListener);
        };
    }, []);

    const onConnect: OnConnect = useCallback(
        (params) => {
            // 只有成功的才会到这，所以不需要再验证
            setEdges((eds) => addEdge(params, eds));
        },
        [setEdges, validateConnection]
    );

    const onNodeDragStop = useCallback((_event: any, node: Node) => {
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            const nodeType = event.dataTransfer.getData('application/reactflow');

            if (typeof nodeType === 'undefined' || !nodeType || !reactFlowBounds || !reactFlowInstance) {
                return;
            }

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            // 从节点注册表获取模板
            const template = nodeRegistry.get(nodeType);
            if (!template) {
                message.error(`未找到节点类型: ${nodeType}`);
                return;
            }

            const newNodeId = `node_${Date.now()}`;
            const initialData = template.initialData();

            // 使用端口管理器为节点分配端口ID
            const portConfigs = template.getPorts(initialData);

            const newNode: Node = {
                id: newNodeId,
                type: nodeType,
                position,
                data: {
                    ...initialData,
                    id: newNodeId,
                    nodeType: nodeType,
                },
            };

            setNodes((nds) => nds.concat(newNode));

            // 触发创建钩子
            if (template.hooks?.onCreated) {
                template.hooks.onCreated(newNodeId, newNode.data);
            }

            // 触发节点事件
            nodeRegistry.emitEvent({
                type: 'created',
                nodeId: newNodeId,
                nodeType: nodeType,
                data: newNode.data,
                timestamp: Date.now(),
            });
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            setContextMenu({
                show: true,
                x: event.clientX,
                y: event.clientY,
                nodeId: node.id,
            });
        },
        []
    );

    const onPaneClick = useCallback(() => {
        setContextMenu({ show: false, x: 0, y: 0 });
    }, []);

    const deleteNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // 获取节点模板并触发删除钩子
        const template = nodeRegistry.get(node.data.nodeType);
        if (template?.hooks?.onDeleted) {
            template.hooks.onDeleted(nodeId, node.data);
        }

        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setContextMenu({ show: false, x: 0, y: 0 });

        // 触发节点事件
        nodeRegistry.emitEvent({
            type: 'deleted',
            nodeId: nodeId,
            nodeType: node.data.nodeType,
            data: node.data,
            timestamp: Date.now(),
        });

        message.success('节点已删除');
    }, [nodes, setNodes, setEdges]);

    const duplicateNode = useCallback((nodeId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
            const template = nodeRegistry.get(node.data.nodeType);
            if (!template) {
                message.error('无法复制：未找到节点模板');
                return;
            }

            const newNodeId = `node_${Date.now()}`;
            const newNode: Node = {
                ...node,
                id: newNodeId,
                position: {
                    x: node.position.x + 20,
                    y: node.position.y + 20,
                },
                data: {
                    ...node.data,
                    id: newNodeId,
                },
            };
            setNodes((nds) => nds.concat(newNode));

            // 触发创建钩子
            if (template.hooks?.onCreated) {
                template.hooks.onCreated(newNodeId, newNode.data);
            }

            message.success('节点已复制');
        }
        setContextMenu({ show: false, x: 0, y: 0 });
    }, [nodes, setNodes]);

    const handleViewMetadata = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setMetadataModal({
                visible: true,
                nodeData: node,
            });
        }
        setContextMenu({ show: false, x: 0, y: 0 });
    }, [nodes]);

    // 手动触发的工作流更新函数，避免无限循环
    const updateWorkflow = useCallback(() => {
        if (onWorkflowChange) {
            const updatedWorkflow: Workflow = {
                id: workflow?.id || 'workflow_1',
                name: workflow?.name || '未命名工作流',
                description: workflow?.description,
                nodes: nodes.map(node => ({
                    id: node.id,
                    type: node.type || 'data-string',
                    position: node.position,
                    data: node.data,
                })),
                edges: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    sourceHandle: edge.sourceHandle || '',
                    target: edge.target,
                    targetHandle: edge.targetHandle || '',
                })),
                variables: {}, // 不再使用传统的全局变量
            };
            onWorkflowChange(updatedWorkflow);
        }
    }, [nodes, edges, onWorkflowChange]); // 移除workflow依赖避免循环

    const handleSave = () => {
        updateWorkflow();
        message.success('工作流已保存');
    };

    const handleRun = async () => {
        if (nodes.length === 0) {
            message.warning('请先添加一些节点到工作流中');
            return;
        }

        message.success('工作流开始运行');
        console.log('运行工作流，节点数量:', nodes.length);

        // 这里可以添加实际的工作流执行逻辑
        for (const node of nodes) {
            const template = nodeRegistry.get(node.data.nodeType);
            if (template) {
                try {
                    const result = await template.execute({}, node.data, {
                        workflowId: workflow?.id || 'workflow_1',
                        nodeId: node.id,
                        variables: {},
                        logger: {
                            info: (msg) => console.log(`[${node.id}] ${msg}`),
                            warn: (msg) => console.warn(`[${node.id}] ${msg}`),
                            error: (msg) => console.error(`[${node.id}] ${msg}`),
                        },
                    });
                    console.log(`节点 ${node.id} 执行结果:`, result);
                } catch (error) {
                    console.error(`节点 ${node.id} 执行失败:`, error);
                }
            }
        }
    };

    return (
        <Layout className="h-screen">
            <Header className="bg-white border-b border-gray-200 shadow-sm px-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Title level={3} className="m-0 text-gray-800">
                        工作流编辑器
                    </Title>
                    <span className="text-gray-500 text-sm">
                        {nodes.length} 个节点
                    </span>
                    {isPending && (
                        <span className="text-blue-500 text-sm animate-pulse">
                            正在更新...
                        </span>
                    )}
                </div>

                <Space>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        保存
                    </Button>
                    <Button
                        icon={<PlayCircleOutlined />}
                        onClick={handleRun}
                        className="border-green-500 text-green-600 hover:border-green-600 hover:text-green-700"
                    >
                        运行
                    </Button>
                </Space>
            </Header>

            <Layout>
                <Sider
                    width={300}
                    className="bg-white border-r border-gray-200"
                    collapsible={false}
                >
                    <NodePalette nodeRegistry={nodeRegistry} />
                </Sider>

                <Content className="relative bg-gray-50">
                    <div ref={reactFlowWrapper} className="w-full h-full">
                        {!nodeTypesReady ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                    <p className="text-gray-600">正在加载节点类型...</p>
                                </div>
                            </div>
                        ) : (
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeDragStop={onNodeDragStop}
                                onInit={setReactFlowInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeContextMenu={onNodeContextMenu}
                                onPaneClick={onPaneClick}
                                nodeTypes={nodeTypes}
                                fitView
                                attributionPosition="bottom-left"
                                proOptions={{
                                    hideAttribution: true,
                                }}
                                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                                minZoom={0.1}
                                maxZoom={4}
                                onlyRenderVisibleElements={true}
                                snapToGrid={false}
                                snapGrid={[15, 15]}
                                nodesDraggable={true}
                                nodesConnectable={true}
                                elementsSelectable={true}
                                selectNodesOnDrag={false}
                                multiSelectionKeyCode="Shift"
                                panOnDrag={[0, 1, 2]}
                                zoomOnScroll={true}
                                zoomOnPinch={true}
                                zoomOnDoubleClick={false}
                                preventScrolling={true}
                                onMove={() => { }} // 空函数但避免 undefined
                                onMoveStart={() => { }} // 空函数但避免 undefined
                                // 连接验证
                                isValidConnection={isValidConnection}
                            >
                                <Background color="#e5e7eb" gap={16} />
                                <Controls />
                                <MiniMap />
                            </ReactFlow>
                        )}

                        {contextMenu.show && (
                            <ContextMenu
                                x={contextMenu.x}
                                y={contextMenu.y}
                                onDelete={() => contextMenu.nodeId && deleteNode(contextMenu.nodeId)}
                                onDuplicate={() => contextMenu.nodeId && duplicateNode(contextMenu.nodeId)}
                                onViewMetadata={() => contextMenu.nodeId && handleViewMetadata(contextMenu.nodeId)}
                                onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
                            />
                        )}

                        {metadataModal.visible && metadataModal.nodeData && (
                            <MetadataModal
                                visible={metadataModal.visible}
                                onClose={() => setMetadataModal({ visible: false })}
                                nodeData={metadataModal.nodeData}
                            />
                        )}
                    </div>
                </Content>


            </Layout>
        </Layout>
    );
};

const WorkflowEditorWrapper: React.FC<WorkflowEditorProps> = (props) => (
    <App>
        <ReactFlowProvider>
            <WorkflowEditor {...props} />
        </ReactFlowProvider>
    </App>
);

export default WorkflowEditorWrapper;