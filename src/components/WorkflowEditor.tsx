import React, { useCallback, useState, useRef, useEffect, useMemo, useTransition } from 'react';
import ReactFlow, {
    addEdge,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    MarkerType,
} from 'reactflow';
import type {
    Node,
    NodeTypes,
    OnConnect,
    ReactFlowInstance,
    Connection,
} from 'reactflow';
import { Layout, Button, Space, Typography, App } from 'antd';
import { SaveOutlined, PlayCircleOutlined } from '@ant-design/icons';
import 'reactflow/dist/style.css';
import type { Workflow, NodeTemplate } from '../types/workflow';
import type { UpstreamDataOption } from './general/ParameterSelector';
import NodePalette from './editor/NodePalette';
import ContextMenu from './editor/ContextMenu';
import MetadataModal from './editor/MetadataModal';
import { DefaultNode } from './default/DefaultNode';

import { nodeRegistry } from '../core/NodeRegistry';
import { WorkflowExecutor } from '../core/WorkflowExecutor';
import { startNodeTemplate } from '../nodeTemplates/StartNodeTemplate';
import { endNodeTemplate } from '../nodeTemplates/EndNodeTemplate';
import {
    textProcessorTemplate,
    mathProcessorTemplate,
    conditionalTemplate
} from '../nodeTemplates/ProcessingNodeTemplates';
import { loopNodeTemplate } from '../nodeTemplates/LoopNodeTemplate';


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
    // 初始化节点时构建父节点指针（单父节点模式）
    const initializeNodesWithParentPointers = (nodes: any[], edges: any[]) => {
        return nodes.map(node => {
            const incomingEdge = edges.find(edge => edge.target === node.id);

            return {
                ...node,
                parentNode: incomingEdge?.source || undefined
            };
        });
    };

    const [nodes, setNodes, onNodesChange] = useNodesState(
        workflow?.nodes ? initializeNodesWithParentPointers(workflow.nodes, workflow.edges || []) : []
    );

    // 为所有边添加箭头标记
    const initialEdges = useMemo(() => {
        return (workflow?.edges || []).map(edge => ({
            ...edge,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#4f46e5',
            },
            style: {
                strokeWidth: 2,
                stroke: '#4f46e5',
            },
        }));
    }, [workflow?.edges]);

    const [edges, setEdges] = useEdgesState(initialEdges);

    // 自定义边变化处理器，维护单父节点指针
    const handleEdgesChange = useCallback((changes: any[]) => {
        // 先处理删除的边，更新父节点指针
        const removedEdges = changes
            .filter(change => change.type === 'remove')
            .map(change => edges.find(edge => edge.id === change.id))
            .filter((edge): edge is NonNullable<typeof edge> => edge != null);

        // 更新节点的父节点指针（单父节点模式）
        if (removedEdges.length > 0) {
            setNodes((nds) =>
                nds.map((node: any) => {
                    const removedParentEdge = removedEdges.find(edge => edge.target === node.id);

                    if (removedParentEdge) {
                        return {
                            ...node,
                            parentNode: undefined // 移除父节点指针
                        };
                    }
                    return node;
                })
            );
        }

        // 应用边的变化
        setEdges((currentEdges) => {
            let newEdges = [...currentEdges];
            changes.forEach(change => {
                if (change.type === 'remove') {
                    const index = newEdges.findIndex(edge => edge.id === change.id);
                    if (index >= 0) {
                        newEdges.splice(index, 1);
                    }
                } else if (change.type === 'add') {
                    newEdges.push(change.item);
                }
                // 可以添加其他类型的变化处理
            });
            return newEdges;
        });
    }, [edges, setEdges, setNodes]);

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



    // 简化的上游数据获取（单父节点 + 直接数据流）
    const getUpstreamDataOptions = useCallback((nodeId: string): UpstreamDataOption[] => {
        const options: UpstreamDataOption[] = [];

        // 找到当前节点
        const currentNode: any = nodes.find(n => n.id === nodeId);
        if (!currentNode?.parentNode) {
            return options; // 没有父节点，返回空选项
        }

        // 找到父节点
        const parentNode = nodes.find(n => n.id === currentNode.parentNode);
        if (!parentNode) {
            return options; // 父节点不存在，返回空选项
        }

        // 获取父节点的显示名称
        const parentName = parentNode.data?.metadata?.name || parentNode.type || parentNode.id;

        // 简化策略：每个节点提供一个统一的输出接口
        // 特殊处理开始节点的多字段输出
        if (parentNode.type === 'workflow-start' && parentNode.data?.fields) {
            // 开始节点：提供每个字段作为独立选项
            parentNode.data.fields.forEach((field: any) => {
                options.push({
                    nodeId: parentNode.id,
                    outputKey: field.name,
                    outputType: field.type,
                    label: `${parentName}.${field.name}`,
                    value: `${parentNode.id}:${field.name}`
                });
            });
        } else {
            // 其他节点：统一的输出接口
            const outputType = getDataTypeFromNodeType(parentNode.type || '');
            options.push({
                nodeId: parentNode.id,
                outputKey: 'output',
                outputType: outputType,
                label: `来自 ${parentName}`,
                value: `${parentNode.id}:output`
            });
        }

        return options;
    }, [nodes]);

    // 辅助函数：从节点类型推断输出数据类型
    const getDataTypeFromNodeType = (nodeType: string): string => {
        switch (nodeType) {
            case 'data-string':
                return 'string';
            case 'data-number':
                return 'number';
            case 'data-boolean':
                return 'boolean';
            case 'data-array':
                return 'array';
            case 'data-object':
                return 'object';
            case 'text-processor':
                return 'any'; // 文本处理可能返回字符串或数组
            case 'math-processor':
                return 'number';
            case 'conditional':
                return 'any'; // 条件判断可能返回任何类型
            case 'loop-processor':
                return 'array'; // 循环处理器通常返回数组
            case 'workflow-start':
                return 'object'; // 开始节点返回对象
            default:
                return 'any';
        }
    };

    // 辅助函数：为不同节点类型创建初始数据
    const createInitialDataForNodeType = (nodeType: string): any => {
        switch (nodeType) {
            case 'text-processor':
                return {
                    operation: 'uppercase',
                    metadata: { name: '文本处理器' },
                    parameterSelections: {
                        textInput: {
                            parameterKey: 'textInput',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        }
                    },
                    searchText: '',
                    replaceText: '',
                    separator: ',',
                    concatSeparator: ' '
                };
            case 'math-processor':
                return {
                    operation: 'add',
                    metadata: { name: '数学计算器' },
                    parameterSelections: {
                        number1: {
                            parameterKey: 'number1',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        },
                        number2: {
                            parameterKey: 'number2',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        }
                    }
                };
            case 'conditional':
                return {
                    condition: 'equals',
                    metadata: { name: '条件判断' },
                    parameterSelections: {
                        value1: {
                            parameterKey: 'value1',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        },
                        value2: {
                            parameterKey: 'value2',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        },
                        trueValue: {
                            parameterKey: 'trueValue',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        },
                        falseValue: {
                            parameterKey: 'falseValue',
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        }
                    }
                };
            case 'workflow-start':
                return {
                    fields: [
                        {
                            name: 'input',
                            type: 'string',
                            defaultValue: '',
                            description: '默认输入字段'
                        }
                    ],
                    metadata: { name: '开始节点' }
                };
            case 'workflow-end':
                return {
                    outputFormat: { type: 'json' },
                    showPreview: true,
                    saveToFile: false,
                    fileName: 'workflow_output.json',
                    metadata: { name: '结束节点' },
                    parameterSelections: {
                        finalData: {
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        }
                    }
                };
            case 'loop-processor':
                return {
                    loopType: 'forEach',
                    maxIterations: 1000,
                    collectResults: true,
                    breakOnError: false,
                    loopBodyExpression: 'element => element',
                    metadata: { name: '循环处理器' },
                    parameterSelections: {
                        inputArray: {
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        },
                        loopFunction: {
                            source: 'upstream' as const,
                            sourceNodeId: undefined,
                            sourceOutputKey: undefined
                        }
                    }
                };
            default:
                return { metadata: { name: nodeType } };
        }
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

                    // 获取上游数据选项
                    const upstreamOptions = getUpstreamDataOptions(props.id);

                    return template.renderInEditor(nodeData, selected, onDataChange, template.metadata, {
                        nodeId: props.id,
                        availableUpstreamData: upstreamOptions
                    });
                }

                // 默认渲染
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
                        hasInput={true}
                        hasOutput={true}
                    />
                );
            });
        });

        return types;
    }, [setNodes, nodeTypesReady]); // 添加 nodeTypesReady 作为依赖项

    const validateConnection = useCallback((connection: Connection): { allowed: boolean; message?: string } => {
        if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
            return { allowed: false, message: '连接参数不完整' };
        }

        // 获取源节点和目标节点
        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode: any = nodes.find(node => node.id === connection.target);

        if (!sourceNode || !targetNode) {
            return { allowed: false, message: '源节点或目标节点不存在' };
        }

        // 单父节点约束：检查目标节点是否已经有父节点
        if (targetNode.parentNode && targetNode.parentNode !== connection.source) {
            return { allowed: false, message: '每个节点只能有一个输入连接' };
        }

        // 防止自环连接
        if (connection.source === connection.target) {
            return { allowed: false, message: '节点不能连接到自己' };
        }

        // 获取节点模板以便进行进一步的验证（如果需要的话）
        const sourceTemplate = nodeRegistry.get(sourceNode.type || '');
        const targetTemplate = nodeRegistry.get(targetNode.type || '');

        if (!sourceTemplate || !targetTemplate) {
            return { allowed: false, message: '源节点或目标节点模板不存在' };
        }

        return { allowed: true, message: '连接允许' };
    }, [nodes]);

    // 使用 useRef 跟踪已显示的错误，防止重复弹出
    const shownErrorRef = useRef<string>('');

    // 为 ReactFlow 提供的包装函数
    const isValidConnection = useCallback((connection: Connection): boolean => {
        // 基础连接检查
        if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
            return false;
        }

        // 不能连接自己
        if (connection.source === connection.target) {
            return false;
        }

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

                    // 清除错误标记，允许一段时间后重新显示
                    setTimeout(() => {
                        shownErrorRef.current = '';
                    }, 3000);
                }
            } else {
                // 如果找不到节点，仍然显示错误
                message.error(result.message || '连接验证失败');
            }
        }
        return result.allowed;
    }, [validateConnection, nodes]);


    // 初始化节点注册表 - 使用新的节点模板
    useEffect(() => {
        // 清除旧的节点模板
        nodeRegistry.reset();

        // 注册新的节点模板
        const templates: NodeTemplate<any>[] = [
            // 工作流控制节点
            startNodeTemplate,
            endNodeTemplate,

            // 数据处理节点
            textProcessorTemplate,
            mathProcessorTemplate,
            conditionalTemplate,
            loopNodeTemplate,
        ];

        // 批量注册节点模板
        nodeRegistry.registerBatch(templates);

        console.log('已注册节点类型:', nodeRegistry.getAll().map(t => t.metadata.type));

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
            // 根据连接类型设置不同的样式
            const isLoopBodyConnection = params.sourceHandle === 'loop-body';

            // 为连接添加箭头标记
            const edgeWithArrow = {
                ...params,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: isLoopBodyConnection ? '#7c3aed' : '#4f46e5',
                },
                style: {
                    strokeWidth: 2,
                    stroke: isLoopBodyConnection ? '#7c3aed' : '#4f46e5',
                    strokeDasharray: isLoopBodyConnection ? '5,5' : undefined, // 循环体连接使用虚线
                },
                label: isLoopBodyConnection ? '循环体' : undefined,
                labelStyle: { fontSize: 10, fill: '#7c3aed' },
                labelBgStyle: { fill: '#f3f4f6', fillOpacity: 0.8 }
            };

            // 添加边
            setEdges((eds) => addEdge(edgeWithArrow, eds));

            if (params.target && params.source) {
                setNodes((nds) =>
                    nds.map((node: any) => {
                        if (node.id === params.target) {
                            if (isLoopBodyConnection) {
                                // 循环体分支连接
                                return {
                                    ...node,
                                    parentNode: params.source, // 设置为父节点（用于获取循环上下文）
                                    isLoopBodyNode: true, // 标记为循环体节点
                                    loopParentNode: params.source // 额外记录循环父节点
                                };
                            } else {
                                // 普通数据流连接
                                return {
                                    ...node,
                                    parentNode: params.source
                                };
                            }
                        }

                        // 如果是循环节点作为源节点，更新其循环体子节点引用
                        if (node.id === params.source && isLoopBodyConnection) {
                            return {
                                ...node,
                                loopBodyNode: params.target
                            };
                        }

                        return node;
                    })
                );
            }
        },
        [setEdges, setNodes]
    );

    const onNodeDragStop = useCallback((_event: any, _node: Node) => {
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

            // 根据节点类型创建默认数据
            const initialData = createInitialDataForNodeType(nodeType);

            // 端口配置已简化，不再需要复杂的端口管理

            const newNode: any = {
                id: newNodeId,
                type: nodeType,
                position,
                data: {
                    ...initialData,
                    id: newNodeId,
                    nodeType: nodeType,
                    metadata: template.metadata,
                },
                parentNode: undefined, // 初始化时没有父节点
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
            const newNode: any = {
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
                parentNodes: [], // 复制的节点初始化空的父节点指针数组
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

    // 简化的工作流验证函数（单父节点模式）
    const validateWorkflow = useCallback((): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        for (const node of nodes) {
            const nodeAny = node as any;
            const template = nodeRegistry.get(node.type || '');
            if (!template) continue;

            // 检查需要输入字段的节点是否有父节点
            if (template.inputFields && template.inputFields.length > 0) {
                if (!nodeAny.parentNode) {
                    const nodeLabel = nodeAny.data?.metadata?.name || node.type || node.id;
                    errors.push(`节点"${nodeLabel}"缺少上游数据源`);
                    continue;
                }

                // 获取上游数据选项
                const upstreamOptions = getUpstreamDataOptions(node.id);

                // 检查每个必需参数是否有有效的上游数据源
                for (const field of template.inputFields) {
                    if (field.required !== false) { // 默认为必需
                        const hasValidUpstream = upstreamOptions.some(option =>
                            option.outputType === field.type || field.type === 'any'
                        );

                        if (!hasValidUpstream) {
                            const nodeLabel = nodeAny.data?.metadata?.name || node.type || node.id;
                            errors.push(`节点"${nodeLabel}"的参数"${field.name}"缺少类型为"${field.type}"的上游数据源`);
                        }
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }, [nodes, getUpstreamDataOptions]);

    const handleRun = async () => {
        if (nodes.length === 0) {
            message.warning('请先添加一些节点到工作流中');
            return;
        }

        // 检查是否有开始节点和结束节点
        const hasStartNode = nodes.some(node => node.type === 'workflow-start');
        const hasEndNode = nodes.some(node => node.type === 'workflow-end');

        if (!hasStartNode) {
            message.error('工作流必须包含一个开始节点');
            return;
        }

        if (!hasEndNode) {
            message.error('工作流必须包含一个结束节点');
            return;
        }

        // 使用简化的验证逻辑
        const validation = validateWorkflow();
        if (!validation.isValid) {
            message.error({
                content: (
                    <div>
                        <div className="font-medium mb-2">工作流验证失败，请检查以下问题：</div>
                        <ul className="list-disc pl-4 space-y-1">
                            {validation.errors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                            ))}
                        </ul>
                    </div>
                ),
                duration: 8,
            });
            return;
        }

        message.info('工作流开始执行...');
        console.log('执行工作流，节点数量:', nodes.length);

        try {
            // 创建工作流执行器
            const executor = new WorkflowExecutor(workflow?.id || `workflow_${Date.now()}`);

            // 构建工作流对象
            const currentWorkflow: Workflow = {
                id: workflow?.id || `workflow_${Date.now()}`,
                name: workflow?.name || '未命名工作流',
                description: workflow?.description,
                nodes: nodes.map(node => ({
                    id: node.id,
                    type: node.type || 'unknown',
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
                variables: {},
            };

            // 执行工作流
            const executionResult = await executor.executeWorkflow(currentWorkflow);

            if (executionResult.success) {
                message.success('工作流执行成功！');
                console.log('工作流执行结果:', executionResult);

                if (executionResult.finalOutput) {
                    console.log('最终输出:', executionResult.finalOutput);
                }
            } else {
                message.error(`工作流执行失败: ${executionResult.error}`);
                console.error('工作流执行失败:', executionResult.error);
            }

            // 显示执行详情
            console.table(Object.values(executionResult.results).map(result => ({
                节点ID: result.nodeId,
                节点类型: result.nodeType,
                执行状态: result.success ? '成功' : '失败',
                执行时间: new Date(result.timestamp).toLocaleTimeString(),
                错误信息: result.error || '-'
            })));

        } catch (error) {
            message.error('工作流执行出现异常');
            console.error('工作流执行异常:', error);
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
                                onEdgesChange={handleEdgesChange}
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