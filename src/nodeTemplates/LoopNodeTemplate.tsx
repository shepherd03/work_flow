import React from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { Input, Tag, Typography, Select, Switch, Divider, InputNumber } from 'antd';
import { GeneralNodeWrapper } from '../components/general/GeneralNodeWrapper';
import { ParameterSelector } from '../components/general/ParameterSelector';
import type { NodeTemplate, NodeParameter } from '../types/workflow';

const { Text } = Typography;

// 循环类型定义
type LoopType = 'forEach' | 'map' | 'filter' | 'reduce';

// 循环节点数据结构
interface LoopNodeData {
    metadata?: {
        name?: string;
    };
    parameterSelections?: Record<string, any>;
    loopType: LoopType;           // 循环类型
    maxIterations?: number;       // 最大迭代次数（防止无限循环）
    collectResults: boolean;      // 是否收集每次循环的结果
    breakOnError: boolean;        // 遇到错误时是否中断循环
    loopBodyExpression: string;   // 循环体表达式（简化版）
}

// 循环节点的输入参数
const loopNodeParameters: NodeParameter[] = [
    {
        key: 'inputArray',
        name: '输入数组',
        type: 'array',
        required: true,
        description: '要进行循环处理的数组数据'
    },
    {
        key: 'loopFunction',
        name: '循环函数',
        type: 'string',
        required: false,
        description: '可选：自定义循环处理函数'
    }
];

/**
 * 创建循环节点模板
 * 循环节点用于对数组进行迭代处理，支持多种循环模式
 */
export const createLoopNodeTemplate = (): NodeTemplate<LoopNodeData> => {
    return {
        metadata: {
            type: "loop-processor",
            name: "循环处理器",
            description: "对数组数据进行循环处理，支持forEach、map、filter等操作",
            category: '控制流',
            icon: React.createElement(ReloadOutlined),
        },

        // 循环节点需要输入数组数据
        inputFields: loopNodeParameters,

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            // 检查输入数组参数
            if (!nodeData.parameterSelections || !nodeData.parameterSelections.inputArray) {
                errors.push('循环节点需要输入数组数据');
            } else {
                const arraySelection = nodeData.parameterSelections.inputArray;
                if (arraySelection.source === 'upstream' &&
                    (!arraySelection.sourceNodeId || !arraySelection.sourceOutputKey)) {
                    errors.push('输入数组参数必须选择有效的上游数据源');
                }
            }

            // 检查最大迭代次数
            if (nodeData.maxIterations && nodeData.maxIterations <= 0) {
                errors.push('最大迭代次数必须大于0');
            }

            if (nodeData.maxIterations && nodeData.maxIterations > 10000) {
                warnings.push('最大迭代次数过大，可能影响性能');
            }

            // 检查循环体表达式
            if (!nodeData.loopBodyExpression || nodeData.loopBodyExpression.trim() === '') {
                warnings.push('未定义循环体表达式，将使用默认处理');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            // 从inputs中获取解析后的数据
            const inputArray = (inputs as any)?.inputArray || (inputs as any)?.input || [];
            const loopFunction = (inputs as any)?.loopFunction;

            context.logger?.info(`开始执行循环处理，类型: ${nodeData.loopType}`);

            // 验证输入数组
            if (!Array.isArray(inputArray)) {
                throw new Error('输入数据必须是数组类型');
            }

            // 检查是否有循环体分支节点
            const loopBodyNode = await context.getLoopBodyNode?.(context.nodeId);
            const hasLoopBodyBranch = !!loopBodyNode;

            // 限制最大迭代次数
            const maxIterations = nodeData.maxIterations || 1000;
            const actualArray = inputArray.slice(0, maxIterations);

            if (inputArray.length > maxIterations) {
                context.logger?.warn(`数组长度超过最大迭代次数，已截断至 ${maxIterations} 项`);
            }

            let result: any;
            let processedCount = 0;
            const errors: string[] = [];

            try {
                switch (nodeData.loopType) {
                    case 'forEach':
                        // forEach: 对每个元素执行操作，不返回新数组
                        const forEachResults: any[] = [];
                        for (let i = 0; i < actualArray.length; i++) {
                            const element = actualArray[i];
                            try {
                                let processed;
                                if (hasLoopBodyBranch) {
                                    // 使用循环体分支处理
                                    processed = await context.executeLoopBody?.(
                                        context.nodeId,
                                        loopBodyNode,
                                        element,
                                        i,
                                        actualArray
                                    );
                                } else {
                                    // 使用内置表达式处理
                                    processed = await processLoopElement(
                                        element,
                                        i,
                                        actualArray,
                                        nodeData.loopBodyExpression,
                                        loopFunction,
                                        context
                                    );
                                }

                                if (nodeData.collectResults) {
                                    forEachResults.push(processed);
                                }
                                processedCount++;
                            } catch (error) {
                                const errorMsg = `第 ${i} 项处理失败: ${error}`;
                                errors.push(errorMsg);
                                if (nodeData.breakOnError) break;
                            }
                        }
                        result = nodeData.collectResults ? forEachResults : actualArray;
                        break;

                    case 'map':
                        // map: 转换每个元素，返回新数组
                        result = [];
                        for (let i = 0; i < actualArray.length; i++) {
                            const element = actualArray[i];
                            try {
                                let processed;
                                if (hasLoopBodyBranch) {
                                    // 使用循环体分支处理
                                    processed = await context.executeLoopBody?.(
                                        context.nodeId,
                                        loopBodyNode,
                                        element,
                                        i,
                                        actualArray
                                    );
                                } else {
                                    // 使用内置表达式处理
                                    processed = await processLoopElement(
                                        element,
                                        i,
                                        actualArray,
                                        nodeData.loopBodyExpression,
                                        loopFunction,
                                        context
                                    );
                                }
                                result.push(processed);
                                processedCount++;
                            } catch (error) {
                                const errorMsg = `第 ${i} 项转换失败: ${error}`;
                                errors.push(errorMsg);
                                if (nodeData.breakOnError) break;
                                result.push(null); // 失败时推入null
                            }
                        }
                        break;

                    case 'filter':
                        // filter: 过滤元素，返回符合条件的元素
                        result = [];
                        for (let i = 0; i < actualArray.length; i++) {
                            const element = actualArray[i];
                            try {
                                let shouldKeep;
                                if (hasLoopBodyBranch) {
                                    // 使用循环体分支处理
                                    shouldKeep = await context.executeLoopBody?.(
                                        context.nodeId,
                                        loopBodyNode,
                                        element,
                                        i,
                                        actualArray
                                    );
                                } else {
                                    // 使用内置表达式处理
                                    shouldKeep = await processLoopElement(
                                        element,
                                        i,
                                        actualArray,
                                        nodeData.loopBodyExpression,
                                        loopFunction,
                                        context
                                    );
                                }

                                if (shouldKeep) {
                                    result.push(element);
                                }
                                processedCount++;
                            } catch (error) {
                                const errorMsg = `第 ${i} 项过滤失败: ${error}`;
                                errors.push(errorMsg);
                                if (nodeData.breakOnError) break;
                            }
                        }
                        break;

                    case 'reduce':
                        // reduce: 累积处理，返回单个值
                        result = actualArray.length > 0 ? actualArray[0] : null;
                        for (let i = 1; i < actualArray.length; i++) {
                            const element = actualArray[i];
                            try {
                                if (hasLoopBodyBranch) {
                                    // 使用循环体分支处理（reduce模式下传入累积器）
                                    result = await context.executeLoopBody?.(
                                        context.nodeId,
                                        loopBodyNode,
                                        { element, accumulator: result }, // 为reduce提供accumulator
                                        i,
                                        actualArray
                                    );
                                } else {
                                    // 使用内置表达式处理
                                    result = await processLoopElement(
                                        element,
                                        i,
                                        actualArray,
                                        nodeData.loopBodyExpression,
                                        loopFunction,
                                        context,
                                        result // 累积器
                                    );
                                }
                                processedCount++;
                            } catch (error) {
                                const errorMsg = `第 ${i} 项累积失败: ${error}`;
                                errors.push(errorMsg);
                                if (nodeData.breakOnError) break;
                            }
                        }
                        break;

                    default:
                        throw new Error(`不支持的循环类型: ${nodeData.loopType}`);
                }

                context.logger?.info(`循环处理完成，处理了 ${processedCount}/${actualArray.length} 项`);

                if (errors.length > 0) {
                    context.logger?.warn(`循环处理中发生 ${errors.length} 个错误: ${errors.join('; ')}`);
                }

                return {
                    output: result,
                    processedCount,
                    totalCount: actualArray.length,
                    errors: errors.length > 0 ? errors : undefined,
                    loopType: nodeData.loopType
                };

            } catch (error) {
                context.logger?.error(`循环处理失败: ${error}`);
                throw error;
            }
        },

        behavior: {
            resizable: true,
            deletable: true,
            copyable: true,
            editable: true,
            connectable: true,
        },

        hooks: {
            onCreated: (nodeId, nodeData) => {
                console.log(`循环节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`循环节点已更新: ${nodeId}`, { oldData, newData });
            },
        },

        extensions: {
            category: 'control',
            tags: ['循环', '控制流', '数组处理'],
            isControlFlow: true,
        },

        renderInEditor: (nodeData, _isSelected, onDataChange, metadata, context) => {
            // 获取上游数据选项
            const upstreamOptions = context?.availableUpstreamData || [];

            return (
                <GeneralNodeWrapper hasInput={true} hasOutput={true} hasLoopBodyOutput={true}>
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-purple-600 text-base">{metadata.icon}</span>
                                <Text strong className="text-sm">{metadata.name}</Text>
                            </div>
                            <Tag color="purple" className="text-xs">
                                {nodeData.loopType?.toUpperCase() || 'LOOP'}
                            </Tag>
                        </div>

                        {/* 节点名称 */}
                        <div>
                            <Text type="secondary" className="text-xs">节点名称:</Text>
                            <Input
                                size="small"
                                value={nodeData.metadata?.name || ''}
                                onChange={(e) => onDataChange({
                                    ...nodeData,
                                    metadata: {
                                        ...nodeData.metadata,
                                        name: e.target.value
                                    }
                                })}
                                placeholder="循环处理器"
                                className="text-xs mt-1"
                            />
                        </div>

                        {/* 参数选择器 */}
                        <div className="space-y-2">
                            <Text strong className="text-xs">输入参数</Text>
                            <ParameterSelector
                                parameters={loopNodeParameters}
                                parameterSelections={nodeData.parameterSelections || {}}
                                availableUpstreamOptions={upstreamOptions}
                                onParameterChange={(parameterKey, selection) => {
                                    const newSelections = {
                                        ...nodeData.parameterSelections,
                                        [parameterKey]: selection
                                    };
                                    onDataChange({
                                        ...nodeData,
                                        parameterSelections: newSelections
                                    });
                                }}
                            />
                        </div>

                        <Divider className="my-3" />

                        {/* 循环配置 */}
                        <div className="space-y-2">
                            <Text strong className="text-xs">循环配置</Text>

                            <div>
                                <Text type="secondary" className="text-xs block mb-1">循环类型:</Text>
                                <Select
                                    size="small"
                                    value={nodeData.loopType || 'forEach'}
                                    onChange={(value) => onDataChange({
                                        ...nodeData,
                                        loopType: value
                                    })}
                                    className="w-full"
                                    options={[
                                        { value: 'forEach', label: 'forEach - 遍历执行' },
                                        { value: 'map', label: 'map - 转换映射' },
                                        { value: 'filter', label: 'filter - 条件过滤' },
                                        { value: 'reduce', label: 'reduce - 累积计算' }
                                    ]}
                                />
                            </div>

                            <div>
                                <Text type="secondary" className="text-xs block mb-1">最大迭代次数:</Text>
                                <InputNumber
                                    size="small"
                                    value={nodeData.maxIterations || 1000}
                                    onChange={(value) => onDataChange({
                                        ...nodeData,
                                        maxIterations: value || 1000
                                    })}
                                    min={1}
                                    max={10000}
                                    className="w-full"
                                    placeholder="1000"
                                />
                            </div>

                            <div>
                                <Text type="secondary" className="text-xs block mb-1">循环体表达式:</Text>
                                <Input.TextArea
                                    size="small"
                                    value={nodeData.loopBodyExpression || ''}
                                    onChange={(e) => onDataChange({
                                        ...nodeData,
                                        loopBodyExpression: e.target.value
                                    })}
                                    placeholder="element => element * 2  // 示例：将每个元素乘以2"
                                    className="text-xs"
                                    rows={3}
                                    style={{ fontFamily: 'monospace' }}
                                />
                                <Text type="secondary" className="text-xs">
                                    支持简单的JavaScript表达式，可用变量：element, index, array
                                </Text>
                            </div>
                        </div>

                        <Divider className="my-3" />

                        {/* 执行选项 */}
                        <div className="space-y-2">
                            <Text strong className="text-xs">执行选项</Text>

                            <div className="flex items-center justify-between">
                                <Text type="secondary" className="text-xs">收集结果:</Text>
                                <Switch
                                    size="small"
                                    checked={nodeData.collectResults !== false}
                                    onChange={(checked) => onDataChange({
                                        ...nodeData,
                                        collectResults: checked
                                    })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Text type="secondary" className="text-xs">遇错中断:</Text>
                                <Switch
                                    size="small"
                                    checked={nodeData.breakOnError === true}
                                    onChange={(checked) => onDataChange({
                                        ...nodeData,
                                        breakOnError: checked
                                    })}
                                />
                            </div>
                        </div>

                        {/* 循环类型说明 */}
                        <div className="bg-purple-50 p-2 rounded">
                            <Text type="secondary" className="text-xs">
                                {getLoopTypeDescription(nodeData.loopType || 'forEach')}
                            </Text>
                        </div>

                        {/* 循环体分支连接说明 */}
                        <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                            <div className="flex items-center space-x-1">
                                <span className="text-purple-600 text-sm">🔗</span>
                                <Text strong className="text-xs text-blue-700">循环体分支</Text>
                            </div>
                            <Text type="secondary" className="text-xs block mt-1">
                                从节点下方的紫色连接点可以连接子节点，作为循环体分支
                            </Text>
                            <Text type="secondary" className="text-xs block mt-1">
                                子节点将接收循环变量：element（当前元素）、index（索引）、array（数组）
                            </Text>
                            <Text className="text-xs block mt-1 font-medium text-purple-700">
                                💡 有分支时优先使用分支逻辑，否则使用表达式
                            </Text>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
};

// 循环元素处理函数
async function processLoopElement(
    element: any,
    index: number,
    array: any[],
    expression: string,
    customFunction: any,
    context: any,
    accumulator?: any
): Promise<any> {
    try {
        // 如果有自定义函数，优先使用
        if (customFunction && typeof customFunction === 'function') {
            return await customFunction(element, index, array, accumulator);
        }

        // 如果有表达式，尝试执行
        if (expression && expression.trim()) {
            // 简单的表达式执行（生产环境中应该使用更安全的方式）
            try {
                // 这里是一个简化版本，实际应该使用更安全的表达式执行器
                if (expression.includes('=>')) {
                    // 箭头函数形式
                    const func = new Function('element', 'index', 'array', 'accumulator',
                        `return (${expression})(element, index, array, accumulator);`);
                    return func(element, index, array, accumulator);
                } else {
                    // 简单表达式
                    const func = new Function('element', 'index', 'array', 'accumulator',
                        `return ${expression};`);
                    return func(element, index, array, accumulator);
                }
            } catch (error) {
                context.logger?.warn(`表达式执行失败: ${error}`);
                return element; // 回退到原始值
            }
        }

        // 默认处理：返回原始元素
        return element;

    } catch (error) {
        context.logger?.error(`循环元素处理失败:`, error);
        throw error;
    }
}

// 获取循环类型描述
function getLoopTypeDescription(loopType: LoopType): string {
    switch (loopType) {
        case 'forEach':
            return '🔄 forEach: 对数组的每个元素执行操作，不改变原数组';
        case 'map':
            return '🔀 map: 将数组的每个元素转换为新值，返回新数组';
        case 'filter':
            return '🔍 filter: 根据条件过滤数组元素，返回符合条件的元素';
        case 'reduce':
            return '📊 reduce: 将数组元素累积为单个值';
        default:
            return '🔄 对数组进行循环处理';
    }
}

export const loopNodeTemplate = createLoopNodeTemplate();
