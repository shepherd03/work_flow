import React from 'react';
import {
    FileTextOutlined,
    CalculatorOutlined,
    BranchesOutlined,
    SwapOutlined,
    FilterOutlined,
    SortAscendingOutlined
} from '@ant-design/icons';
import { Input, InputNumber, Select, Tag, Typography, Card, Divider, Switch } from 'antd';
import { GeneralNodeWrapper } from '../components/general/GeneralNodeWrapper';
import { ParameterSelector, type UpstreamDataOption } from '../components/general/ParameterSelector';
import type { NodeTemplate, Port, ExecutionContext, NodeParameter, ParameterSelection, NodeExecutionResult } from '../types/workflow';

const { Text, Title } = Typography;

// =========================== 文本处理节点 ===========================

interface TextProcessorData {
    operation: 'uppercase' | 'lowercase' | 'trim' | 'replace' | 'split' | 'concat';
    parameterSelections: Record<string, ParameterSelection>; // 参数选择配置
    searchText?: string;     // 用于替换操作
    replaceText?: string;    // 用于替换操作
    separator?: string;      // 用于分割操作
    concatSeparator?: string; // 用于连接操作
}

export const createTextProcessorTemplate = (): NodeTemplate<TextProcessorData> => {
    // 定义节点参数
    const nodeParameters: NodeParameter[] = [
        {
            key: 'textInput',
            name: '输入文本',
            type: 'string',
            required: true,
            description: '要处理的文本内容'
        }
    ];

    return {
        metadata: {
            type: "text-processor",
            name: "文本处理",
            description: "处理文本数据：大小写转换、替换、分割等",
            category: '数据处理',
            icon: React.createElement(FileTextOutlined),
        },

        parameters: nodeParameters,

        initialData: () => ({
            operation: 'uppercase',
            parameterSelections: {
                textInput: {
                    parameterKey: 'textInput',
                    source: 'static',
                    staticValue: ''
                }
            },
            searchText: '',
            replaceText: '',
            separator: ',',
            concatSeparator: ' '
        }),

        getPorts: (nodeData) => ({
            input: { id: 'input', dataType: 'any' },
            output: { id: 'output', dataType: 'any' }
        }),

        validate: (nodeData) => {
            const errors: string[] = [];

            // 检查必需的参数是否已配置
            const textInputSelection = nodeData.parameterSelections?.textInput;

            if (!textInputSelection ||
                (textInputSelection.source === 'static' && textInputSelection.staticValue === undefined)) {
                errors.push('文本输入参数未配置');
            }

            // 检查特定操作的配置
            if (nodeData.operation === 'replace') {
                if (!nodeData.searchText) {
                    errors.push('替换操作需要指定搜索文本');
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings: []
            };
        },

        execute: async (inputs, nodeData, context: ExecutionContext) => {
            // 辅助函数：根据参数选择获取实际值
            const getParameterValue = (parameterKey: string, fallbackValue?: any): any => {
                const selection = nodeData.parameterSelections[parameterKey];
                if (!selection) return fallbackValue;

                if (selection.source === 'static') {
                    return selection.staticValue;
                } else if (selection.source === 'upstream' && selection.sourceNodeId && selection.sourceOutputKey) {
                    // 从工作流上下文获取指定上游节点的数据
                    const sourceResult = context.workflowContext.nodeResults.get(selection.sourceNodeId);
                    if (sourceResult && sourceResult.success) {
                        return sourceResult.outputs[selection.sourceOutputKey];
                    }
                }
                return fallbackValue;
            };

            // 获取文本输入参数
            const textInput = getParameterValue('textInput', '') || '';
            let result: any = textInput;

            context.logger?.info(`文本处理节点执行，输入文本: "${textInput}", 操作: ${nodeData.operation}`);

            if (typeof textInput === 'string') {
                switch (nodeData.operation) {
                    case 'uppercase':
                        result = textInput.toUpperCase();
                        break;
                    case 'lowercase':
                        result = textInput.toLowerCase();
                        break;
                    case 'trim':
                        result = textInput.trim();
                        break;
                    case 'replace':
                        result = textInput.replace(
                            new RegExp(nodeData.searchText || '', 'g'),
                            nodeData.replaceText || ''
                        );
                        break;
                    case 'split':
                        result = textInput.split(nodeData.separator || ',');
                        break;
                    default:
                        result = textInput;
                }
            } else if (nodeData.operation === 'concat' && Array.isArray(textInput)) {
                result = textInput.join(nodeData.concatSeparator || ' ');
            } else {
                result = String(textInput);
            }

            context.logger?.info(`文本处理结果: ${JSON.stringify(result)}`);
            return { output: result };
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata, context) => {
            const ports = createTextProcessorTemplate().getPorts(nodeData);

            // 重新定义参数以供UI使用
            const uiParameters: NodeParameter[] = [
                {
                    key: 'textInput',
                    name: '输入文本',
                    type: 'string',
                    required: true,
                    description: '要处理的文本内容'
                }
            ];

            // 获取真实的上游数据选项
            const upstreamOptions: UpstreamDataOption[] = context?.availableUpstreamData || [];

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-base">{metadata.icon}</span>
                                <Text strong className="text-sm">{metadata.name}</Text>
                            </div>
                            <Tag color="blue" className="text-xs">{metadata.type}</Tag>
                        </div>

                        <div>
                            <Text type="secondary" className="text-xs block mb-1">操作类型:</Text>
                            <Select
                                size="small"
                                value={nodeData.operation}
                                onChange={(value) => onDataChange({ ...nodeData, operation: value })}
                                className="w-full"
                                dropdownStyle={{ fontSize: '12px' }}
                                options={[
                                    { value: 'uppercase', label: '转大写' },
                                    { value: 'lowercase', label: '转小写' },
                                    { value: 'trim', label: '去除空格' },
                                    { value: 'replace', label: '替换文本' },
                                    { value: 'split', label: '分割文本' },
                                    { value: 'concat', label: '连接文本' },
                                ]}
                            />
                        </div>

                        <Divider className="my-3" />

                        {/* 参数配置区域 */}
                        <ParameterSelector
                            parameters={uiParameters}
                            parameterSelections={nodeData.parameterSelections}
                            availableUpstreamOptions={upstreamOptions}
                            onParameterChange={(parameterKey, selection) => {
                                onDataChange({
                                    ...nodeData,
                                    parameterSelections: {
                                        ...nodeData.parameterSelections,
                                        [parameterKey]: selection
                                    }
                                });
                            }}
                        />

                        {/* 操作特定配置 */}
                        {nodeData.operation === 'replace' && (
                            <Card size="small" className="bg-blue-50" bodyStyle={{ padding: '8px' }}>
                                <Text strong className="text-xs block mb-2">替换配置</Text>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Text type="secondary" className="text-xs block mb-1">搜索:</Text>
                                        <Input
                                            size="small"
                                            value={nodeData.searchText || ''}
                                            onChange={(e) => onDataChange({ ...nodeData, searchText: e.target.value })}
                                            placeholder="要替换的文本"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs block mb-1">替换:</Text>
                                        <Input
                                            size="small"
                                            value={nodeData.replaceText || ''}
                                            onChange={(e) => onDataChange({ ...nodeData, replaceText: e.target.value })}
                                            placeholder="替换为"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </Card>
                        )}

                        {nodeData.operation === 'split' && (
                            <Card size="small" className="bg-blue-50" bodyStyle={{ padding: '8px' }}>
                                <Text strong className="text-xs block mb-2">分割配置</Text>
                                <div>
                                    <Text type="secondary" className="text-xs block mb-1">分隔符:</Text>
                                    <Input
                                        size="small"
                                        value={nodeData.separator || ''}
                                        onChange={(e) => onDataChange({ ...nodeData, separator: e.target.value })}
                                        placeholder="分隔符 (如: ,)"
                                        className="w-full"
                                    />
                                </div>
                            </Card>
                        )}

                        {nodeData.operation === 'concat' && (
                            <Card size="small" className="bg-blue-50" bodyStyle={{ padding: '8px' }}>
                                <Text strong className="text-xs block mb-2">连接配置</Text>
                                <div>
                                    <Text type="secondary" className="text-xs block mb-1">连接符:</Text>
                                    <Input
                                        size="small"
                                        value={nodeData.concatSeparator || ''}
                                        onChange={(e) => onDataChange({ ...nodeData, concatSeparator: e.target.value })}
                                        placeholder="连接符 (如: 空格)"
                                        className="w-full"
                                    />
                                </div>
                            </Card>
                        )}
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
};

// =========================== 数学计算节点 ===========================

interface MathProcessorData {
    operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'abs' | 'round';
    parameterSelections: Record<string, ParameterSelection>; // 参数选择配置
}

export const createMathProcessorTemplate = (): NodeTemplate<MathProcessorData> => {
    // 定义节点参数
    const nodeParameters: NodeParameter[] = [
        {
            key: 'number1',
            name: '第一个数字',
            type: 'number',
            required: true,
            description: '要计算的第一个数字'
        },
        {
            key: 'number2',
            name: '第二个数字',
            type: 'number',
            required: false,
            description: '要计算的第二个数字（二元运算时需要）'
        }
    ];

    return {
        metadata: {
            type: "math-processor",
            name: "数学计算",
            description: "执行数学运算：加减乘除、幂运算、开方等",
            category: '数据处理',
            icon: React.createElement(CalculatorOutlined),
        },

        parameters: nodeParameters,

        initialData: () => ({
            operation: 'add',
            parameterSelections: {
                number1: {
                    parameterKey: 'number1',
                    source: 'static',
                    staticValue: 0
                },
                number2: {
                    parameterKey: 'number2',
                    source: 'static',
                    staticValue: 0
                }
            }
        }),

        getPorts: (nodeData) => ({
            input: { id: 'input', dataType: 'number' },
            output: { id: 'output', dataType: 'number' }
        }),

        validate: (nodeData) => {
            const errors: string[] = [];

            // 检查必需的参数是否已配置
            if (['add', 'subtract', 'multiply', 'divide', 'power'].includes(nodeData.operation)) {
                // 二元运算需要两个参数
                const number1Selection = nodeData.parameterSelections?.number1;
                const number2Selection = nodeData.parameterSelections?.number2;

                if (!number1Selection ||
                    (number1Selection.source === 'static' && number1Selection.staticValue === undefined)) {
                    errors.push('第一个数字参数未配置');
                }

                if (!number2Selection ||
                    (number2Selection.source === 'static' && number2Selection.staticValue === undefined)) {
                    errors.push('第二个数字参数未配置');
                }
            } else {
                // 一元运算只需要一个参数
                const number1Selection = nodeData.parameterSelections?.number1;

                if (!number1Selection ||
                    (number1Selection.source === 'static' && number1Selection.staticValue === undefined)) {
                    errors.push('数字参数未配置');
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings: []
            };
        },

        execute: async (inputs, nodeData, context: ExecutionContext) => {
            // 辅助函数：根据参数选择获取实际值
            const getParameterValue = (parameterKey: string, fallbackValue?: any): any => {
                const selection = nodeData.parameterSelections[parameterKey];
                if (!selection) return fallbackValue;

                if (selection.source === 'static') {
                    return selection.staticValue;
                } else if (selection.source === 'upstream' && selection.sourceNodeId && selection.sourceOutputKey) {
                    // 从工作流上下文获取指定上游节点的数据
                    const sourceResult = context.workflowContext.nodeResults.get(selection.sourceNodeId);
                    if (sourceResult && sourceResult.success) {
                        return sourceResult.outputs[selection.sourceOutputKey];
                    }
                }
                return fallbackValue;
            };

            // 获取数字参数
            const number1 = Number(getParameterValue('number1', 0)) || 0;
            const number2 = Number(getParameterValue('number2', 0)) || 0;
            let result: number;

            context.logger?.info(`数学计算节点执行，数字1: ${number1}, 数字2: ${number2}, 操作: ${nodeData.operation}`);

            switch (nodeData.operation) {
                case 'add':
                    result = number1 + number2;
                    break;
                case 'subtract':
                    result = number1 - number2;
                    break;
                case 'multiply':
                    result = number1 * number2;
                    break;
                case 'divide':
                    result = number2 !== 0 ? number1 / number2 : 0;
                    break;
                case 'power':
                    result = Math.pow(number1, number2);
                    break;
                case 'sqrt':
                    result = Math.sqrt(number1);
                    break;
                case 'abs':
                    result = Math.abs(number1);
                    break;
                case 'round':
                    result = Math.round(number1);
                    break;
                default:
                    result = number1;
            }

            context.logger?.info(`数学计算结果: ${result}`);
            return { output: result };
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata, context) => {
            const ports = createMathProcessorTemplate().getPorts(nodeData);

            // 重新定义参数以供UI使用
            const uiParameters: NodeParameter[] = [
                {
                    key: 'number1',
                    name: '第一个数字',
                    type: 'number',
                    required: true,
                    description: '要计算的第一个数字'
                },
                {
                    key: 'number2',
                    name: '第二个数字',
                    type: 'number',
                    required: false,
                    description: '要计算的第二个数字（二元运算时需要）'
                }
            ];

            // 根据运算类型过滤参数
            const filteredParameters = ['add', 'subtract', 'multiply', 'divide', 'power'].includes(nodeData.operation)
                ? uiParameters  // 二元运算需要两个参数
                : [uiParameters[0]]; // 一元运算只需要一个参数

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-green-600 text-base">{metadata.icon}</span>
                                <Text strong className="text-sm">{metadata.name}</Text>
                            </div>
                            <Tag color="green" className="text-xs">{metadata.type}</Tag>
                        </div>

                        <div>
                            <Text type="secondary" className="text-xs block mb-1">运算类型:</Text>
                            <Select
                                size="small"
                                value={nodeData.operation}
                                onChange={(value) => onDataChange({ ...nodeData, operation: value })}
                                className="w-full"
                                dropdownStyle={{ fontSize: '12px' }}
                                options={[
                                    { value: 'add', label: '加法 (+)' },
                                    { value: 'subtract', label: '减法 (-)' },
                                    { value: 'multiply', label: '乘法 (×)' },
                                    { value: 'divide', label: '除法 (÷)' },
                                    { value: 'power', label: '幂运算 (^)' },
                                    { value: 'sqrt', label: '开方 (√)' },
                                    { value: 'abs', label: '绝对值' },
                                    { value: 'round', label: '四舍五入' },
                                ]}
                            />
                        </div>

                        <Divider className="my-3" />

                        {/* 参数配置区域 */}
                        <ParameterSelector
                            parameters={filteredParameters}
                            parameterSelections={nodeData.parameterSelections}
                            availableUpstreamOptions={context?.availableUpstreamData || []}
                            onParameterChange={(parameterKey, selection) => {
                                onDataChange({
                                    ...nodeData,
                                    parameterSelections: {
                                        ...nodeData.parameterSelections,
                                        [parameterKey]: selection
                                    }
                                });
                            }}
                        />
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
};

// =========================== 条件判断节点 ===========================

interface ConditionalData {
    condition: 'equals' | 'not_equals' | 'greater' | 'less' | 'greater_equal' | 'less_equal' | 'contains' | 'starts_with' | 'ends_with';
    parameterSelections: Record<string, ParameterSelection>; // 参数选择配置
}

export const createConditionalTemplate = (): NodeTemplate<ConditionalData> => {
    // 定义节点参数
    const nodeParameters: NodeParameter[] = [
        {
            key: 'value1',
            name: '比较值1',
            type: 'any',
            required: true,
            description: '要比较的第一个值'
        },
        {
            key: 'value2',
            name: '比较值2',
            type: 'any',
            required: true,
            description: '要比较的第二个值'
        },
        {
            key: 'trueValue',
            name: '真值输出',
            type: 'any',
            required: true,
            description: '条件为真时输出的值'
        },
        {
            key: 'falseValue',
            name: '假值输出',
            type: 'any',
            required: true,
            description: '条件为假时输出的值'
        }
    ];

    return {
        metadata: {
            type: "conditional",
            name: "条件判断",
            description: "根据条件判断返回不同的值",
            category: '逻辑控制',
            icon: React.createElement(BranchesOutlined),
        },

        parameters: nodeParameters,

        initialData: () => ({
            condition: 'equals',
            parameterSelections: {
                value1: {
                    parameterKey: 'value1',
                    source: 'static',
                    staticValue: ''
                },
                value2: {
                    parameterKey: 'value2',
                    source: 'static',
                    staticValue: ''
                },
                trueValue: {
                    parameterKey: 'trueValue',
                    source: 'static',
                    staticValue: true
                },
                falseValue: {
                    parameterKey: 'falseValue',
                    source: 'static',
                    staticValue: false
                }
            }
        }),

        getPorts: (nodeData) => ({
            input: { id: 'input', dataType: 'any' },
            output: { id: 'output', dataType: 'any' }
        }),

        validate: (nodeData) => {
            const errors: string[] = [];

            // 检查必需的参数是否已配置
            const requiredParams = ['value1', 'value2', 'trueValue', 'falseValue'];

            for (const paramKey of requiredParams) {
                const selection = nodeData.parameterSelections?.[paramKey];

                if (!selection ||
                    (selection.source === 'static' && selection.staticValue === undefined)) {
                    errors.push(`参数 ${paramKey} 未配置`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings: []
            };
        },

        execute: async (inputs, nodeData, context: ExecutionContext) => {
            // 辅助函数：根据参数选择获取实际值
            const getParameterValue = (parameterKey: string, fallbackValue?: any): any => {
                const selection = nodeData.parameterSelections[parameterKey];
                if (!selection) return fallbackValue;

                if (selection.source === 'static') {
                    return selection.staticValue;
                } else if (selection.source === 'upstream' && selection.sourceNodeId && selection.sourceOutputKey) {
                    // 从工作流上下文获取指定上游节点的数据
                    const sourceResult = context.workflowContext.nodeResults.get(selection.sourceNodeId);
                    if (sourceResult && sourceResult.success) {
                        return sourceResult.outputs[selection.sourceOutputKey];
                    }
                }
                return fallbackValue;
            };

            // 获取比较参数
            const value1 = getParameterValue('value1', '');
            const value2 = getParameterValue('value2', '');
            const trueValue = getParameterValue('trueValue', true);
            const falseValue = getParameterValue('falseValue', false);

            context.logger?.info(`条件判断节点执行，值1: ${JSON.stringify(value1)}, 值2: ${JSON.stringify(value2)}, 条件: ${nodeData.condition}`);

            let conditionResult = false;

            switch (nodeData.condition) {
                case 'equals':
                    conditionResult = value1 === value2;
                    break;
                case 'not_equals':
                    conditionResult = value1 !== value2;
                    break;
                case 'greater':
                    conditionResult = Number(value1) > Number(value2);
                    break;
                case 'less':
                    conditionResult = Number(value1) < Number(value2);
                    break;
                case 'greater_equal':
                    conditionResult = Number(value1) >= Number(value2);
                    break;
                case 'less_equal':
                    conditionResult = Number(value1) <= Number(value2);
                    break;
                case 'contains':
                    conditionResult = String(value1).includes(String(value2));
                    break;
                case 'starts_with':
                    conditionResult = String(value1).startsWith(String(value2));
                    break;
                case 'ends_with':
                    conditionResult = String(value1).endsWith(String(value2));
                    break;
            }

            const result = conditionResult ? trueValue : falseValue;

            context.logger?.info(`条件判断结果: ${conditionResult}, 输出: ${JSON.stringify(result)}`);

            return {
                output: result,
                condition: conditionResult,
                value1,
                value2
            };
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata, context) => {
            const ports = createConditionalTemplate().getPorts(nodeData);

            // 重新定义参数以供UI使用
            const uiParameters: NodeParameter[] = [
                {
                    key: 'value1',
                    name: '比较值1',
                    type: 'any',
                    required: true,
                    description: '要比较的第一个值'
                },
                {
                    key: 'value2',
                    name: '比较值2',
                    type: 'any',
                    required: true,
                    description: '要比较的第二个值'
                },
                {
                    key: 'trueValue',
                    name: '真值输出',
                    type: 'any',
                    required: true,
                    description: '条件为真时输出的值'
                },
                {
                    key: 'falseValue',
                    name: '假值输出',
                    type: 'any',
                    required: true,
                    description: '条件为假时输出的值'
                }
            ];

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-orange-600 text-base">{metadata.icon}</span>
                                <Text strong className="text-sm">{metadata.name}</Text>
                            </div>
                            <Tag color="orange" className="text-xs">{metadata.type}</Tag>
                        </div>

                        <div>
                            <Text type="secondary" className="text-xs block mb-1">条件类型:</Text>
                            <Select
                                size="small"
                                value={nodeData.condition}
                                onChange={(value) => onDataChange({ ...nodeData, condition: value })}
                                className="w-full"
                                dropdownStyle={{ fontSize: '12px' }}
                                options={[
                                    { value: 'equals', label: '等于 (=)' },
                                    { value: 'not_equals', label: '不等于 (≠)' },
                                    { value: 'greater', label: '大于 (>)' },
                                    { value: 'less', label: '小于 (<)' },
                                    { value: 'greater_equal', label: '大于等于 (≥)' },
                                    { value: 'less_equal', label: '小于等于 (≤)' },
                                    { value: 'contains', label: '包含' },
                                    { value: 'starts_with', label: '开始于' },
                                    { value: 'ends_with', label: '结束于' },
                                ]}
                            />
                        </div>

                        <Divider className="my-3" />

                        {/* 参数配置区域 */}
                        <ParameterSelector
                            parameters={uiParameters}
                            parameterSelections={nodeData.parameterSelections}
                            availableUpstreamOptions={context?.availableUpstreamData || []}
                            onParameterChange={(parameterKey, selection) => {
                                onDataChange({
                                    ...nodeData,
                                    parameterSelections: {
                                        ...nodeData.parameterSelections,
                                        [parameterKey]: selection
                                    }
                                });
                            }}
                        />
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
};

// =========================== 导出模板实例 ===========================

export const textProcessorTemplate = createTextProcessorTemplate();
export const mathProcessorTemplate = createMathProcessorTemplate();
export const conditionalTemplate = createConditionalTemplate();
