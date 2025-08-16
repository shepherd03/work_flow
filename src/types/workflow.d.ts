import type { ReactNode, ComponentType } from 'react';

// 节点元数据类型
export interface NodeMetadata {
    type: string;           // 节点类型唯一标识
    name: string;           // 显示名称
    description: string;    // 描述
    category: string;       // 分类
    icon?: ReactNode;       // 图标
}

// 工作流定义
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    nodes: Node[];
    edges: Edge[];
    variables?: Record<string, any>;
}

// 节点定义
export interface Node<T> {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: T;
}

export interface PortConnectionRuleResult {
    allowed: boolean;
    message?: string;
}

// 端口连接规则
export interface PortConnectionRule {
    allowedDataTypes?: string[];  // 允许连接的数据类型列表
    disallowedDataTypes?: string[]; // 禁止连接的数据类型列表
    customValidation?: (sourcePort: Port, targetPort: Port) => PortConnectionRuleResult; // 自定义验证函数
}

// 简化的端口定义 - 每个节点只有一个输入端口和一个输出端口
export interface Port {
    id: string;           // 端口ID
    dataType: string;     // 数据类型
    connectionRules?: PortConnectionRule; // 自定义连接规则
}

// 边定义
export interface Edge {
    id: string;
    source: string;        // 源节点ID
    sourceHandle: string;  // 源端口ID
    target: string;        // 目标节点ID
    targetHandle: string;  // 目标端口ID
    metadata?: Record<string, any>; // 例如条件表达式、优先级等
}

// 节点执行结果
export interface NodeExecutionResult {
    nodeId: string;
    nodeType: string;
    timestamp: number;
    success: boolean;
    outputs: Record<string, any>;
    error?: string;
}

// 工作流执行上下文
export interface WorkflowExecutionContext {
    workflowId: string;
    startTime: number;
    nodeResults: Map<string, NodeExecutionResult>;
    globalVariables: Record<string, any>;
}

// 节点执行上下文（可用于日志、变量存取、流程控制等）
export interface ExecutionContext {
    workflowId: string;
    nodeId: string;
    variables: Record<string, any>;

    // 新增：工作流执行上下文，让节点可以访问整个工作流的状态
    workflowContext: WorkflowExecutionContext;

    // 新增：获取上游节点数据的方法
    getUpstreamData: (nodeId: string) => Record<string, any> | null;

    // 新增：获取所有上游节点数据的方法
    getAllUpstreamData: () => Record<string, Record<string, any>>;

    // 新增：根据节点类型获取上游数据
    getUpstreamDataByType: (nodeType: string) => Record<string, any>[];

    logger?: {
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
    };
    waitUntil?: (key: string, timeoutMs?: number) => Promise<any>; // 支持 asyncWait 模式
    signal?: AbortSignal;
}

// 节点参数定义
export interface NodeParameter {
    key: string;                    // 参数键名
    name: string;                   // 参数显示名称
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'; // 参数类型
    required: boolean;              // 是否必需
    description?: string;           // 参数描述
    defaultValue?: any;             // 默认值
}

// 参数选择配置
export interface ParameterSelection {
    parameterKey: string;           // 参数键名
    source: 'static' | 'upstream';  // 数据源类型：静态值或上游数据
    sourceNodeId?: string;          // 来源节点ID（当source为upstream时）
    sourceOutputKey?: string;       // 来源输出字段名（当source为upstream时）
    staticValue?: any;              // 静态值（当source为static时）
}

// 节点模板
export interface NodeTemplate<T extends Record<string, any>> {
    // 元数据
    metadata: NodeMetadata;

    // 数据结构
    initialData: () => T;  // 初始数据生成器

    // 节点参数定义
    parameters?: NodeParameter[];   // 节点需要的参数定义

    // 简化的端口配置 - 每个节点只有一个输入和一个输出端口
    getPorts: (nodeData: T) => {
        input: Port;
        output: Port;
    };

    // 验证器
    validate?: (nodeData: T) => {
        isValid: boolean;
        errors: string[];
        warnings?: string[];
    };

    // 执行函数
    execute: (
        inputs: T,
        nodeData: T,
        context: ExecutionContext
    ) => Promise<Record<string, any>>;

    renderInPalette?: (nodeData: T, metadata: NodeMetadata) => ReactNode;

    renderInEditor?: (
        nodeData: T,
        isSelected: boolean,
        onDataChange: (data: T) => void,
        metadata: NodeMetadata,
        context?: {
            nodeId?: string;
            availableUpstreamData?: Array<{
                nodeId: string;
                outputKey: string;
                outputType: string;
                label: string;
                value: string;
            }>;
        }
    ) => ReactNode;

    // 样式自定义
    styling?: {
        borderColor?: string;
        backgroundColor?: string;
        textColor?: string;
        iconColor?: string;
    };

    // 行为配置
    behavior?: {
        resizable?: boolean;
        deletable?: boolean;
        copyable?: boolean;
        editable?: boolean;
        connectable?: boolean;
    };

    // 扩展钩子
    hooks?: {
        onCreated?: (nodeId: string, nodeData: T) => void;
        onUpdated?: (nodeId: string, oldData: T, newData: T) => void;
        onDeleted?: (nodeId: string, nodeData: T) => void;
        onConnected?: (nodeId: string, edge: Edge) => void;
        onDisconnected?: (nodeId: string, edge: Edge) => void;
    };

    // 自定义扩展
    extensions?: Record<string, any>;
}

// 节点注册表接口
export interface NodeRegistry {
    register: (template: NodeTemplate) => void;
    unregister: (type: string) => void;
    get: (type: string) => NodeTemplate | undefined;
    getAll: () => NodeTemplate[];
    getByCategory: (category: string) => NodeTemplate[];
    has: (type: string) => boolean;
    search: (query: string) => NodeTemplate[];
    getCategories: () => string[];
}

// 节点事件类型
export interface NodeEvent {
    type: 'created' | 'updated' | 'deleted' | 'connected' | 'disconnected' | 'executed';
    nodeId: string;
    nodeType: string;
    data?: any;
    timestamp: number;
}

// 节点事件监听器
export type NodeEventListener = (event: NodeEvent) => void;

// 工作流编辑器配置
export interface WorkflowEditorConfig {
    nodeRegistry: NodeRegistry;
    enableAutoSave?: boolean;
    autoSaveInterval?: number;
    enableUndo?: boolean;
    maxUndoSteps?: number;
    enableValidation?: boolean;
    enableDebugMode?: boolean;
    customTheme?: Record<string, any>;
}