import React from 'react';
import { Select, Typography, Card } from 'antd';
import type { NodeParameter, ParameterSelection } from '../../types/workflow';

const { Text } = Typography;

// 上游数据字段选项
export interface UpstreamDataOption {
    nodeId: string;
    outputKey: string;
    outputType: string;
    label: string;
    value: string; // format: "nodeId:outputKey"
}

interface ParameterSelectorProps {
    parameters: NodeParameter[];
    parameterSelections: Record<string, ParameterSelection>;
    availableUpstreamOptions: UpstreamDataOption[]; // 可用的上游数据选项
    onParameterChange: (parameterKey: string, selection: ParameterSelection) => void;
}

export const ParameterSelector: React.FC<ParameterSelectorProps> = ({
    parameters,
    parameterSelections,
    availableUpstreamOptions,
    onParameterChange
}) => {

    // 根据参数类型过滤可用的上游数据选项
    const getFilteredUpstreamOptions = (parameterType: string) => {
        return availableUpstreamOptions.filter(option => {
            if (parameterType === 'any') return true;

            // 严格类型匹配
            switch (parameterType) {
                case 'string':
                    return option.outputType === 'string';
                case 'number':
                    return option.outputType === 'number';
                case 'boolean':
                    return option.outputType === 'boolean';
                case 'array':
                    return option.outputType === 'array';
                case 'object':
                    return option.outputType === 'object';
                default:
                    return option.outputType === parameterType;
            }
        });
    };



    return (
        <div className="space-y-3">
            <Text strong className="text-xs">节点参数配置</Text>

            {parameters.map((parameter) => {
                const selection = parameterSelections[parameter.key] || {
                    parameterKey: parameter.key,
                    source: 'static',
                    staticValue: parameter.defaultValue
                };

                const filteredUpstreamOptions = getFilteredUpstreamOptions(parameter.type);

                // 构建数据源选项 - 只显示上游数据选项
                const dataSourceOptions = filteredUpstreamOptions.map(option => ({
                    label: `🔗 ${option.label}`,
                    value: option.value
                }));

                // 当前选择的值 - 如果有上游选项但当前是静态值，自动选择第一个上游选项
                let currentValue = selection.sourceNodeId && selection.sourceOutputKey ?
                    `${selection.sourceNodeId}:${selection.sourceOutputKey}` : undefined;

                // 如果没有当前选择但有可用选项，自动选择第一个
                if (!currentValue && dataSourceOptions.length > 0) {
                    currentValue = dataSourceOptions[0].value;
                    // 自动更新选择
                    const [nodeId, outputKey] = dataSourceOptions[0].value.split(':');
                    setTimeout(() => {
                        onParameterChange(parameter.key, {
                            parameterKey: parameter.key,
                            source: 'upstream',
                            sourceNodeId: nodeId,
                            sourceOutputKey: outputKey
                        });
                    }, 0);
                }

                return (
                    <Card
                        key={parameter.key}
                        size="small"
                        className="bg-gray-50"
                        bodyStyle={{ padding: '8px' }}
                    >
                        <div className="space-y-2">
                            {/* 参数名称和类型 */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                    <Text strong className="text-xs">{parameter.name}</Text>
                                    {parameter.required && <Text type="danger" className="text-xs">*</Text>}
                                </div>
                                <Text type="secondary" className="text-xs">
                                    {parameter.type}
                                </Text>
                            </div>

                            {/* 参数描述 */}
                            {parameter.description && (
                                <Text type="secondary" className="text-xs">
                                    {parameter.description}
                                </Text>
                            )}

                            {/* 数据源选择下拉框 */}
                            <div>
                                <Text type="secondary" className="text-xs block mb-1">选择上游数据:</Text>
                                {dataSourceOptions.length > 0 ? (
                                    <Select
                                        size="small"
                                        value={currentValue}
                                        onChange={(value) => {
                                            // 解析上游数据选择
                                            const [nodeId, outputKey] = value.split(':');
                                            onParameterChange(parameter.key, {
                                                parameterKey: parameter.key,
                                                source: 'upstream',
                                                sourceNodeId: nodeId,
                                                sourceOutputKey: outputKey
                                            });
                                        }}
                                        className="w-full"
                                        dropdownStyle={{ fontSize: '12px' }}
                                        options={dataSourceOptions}
                                        placeholder="选择数据源"
                                    />
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                        <Text type="warning" className="text-xs">
                                            暂无可用的 {parameter.type} 类型上游数据
                                        </Text>
                                        <Text type="secondary" className="text-xs block mt-1">
                                            请先连接提供 {parameter.type} 类型数据的上游节点
                                        </Text>
                                    </div>
                                )}
                            </div>

                            {/* 上游数据信息显示 */}
                            {selection.source === 'upstream' && selection.sourceNodeId && selection.sourceOutputKey && (
                                <div className="bg-green-50 border border-green-200 rounded p-2">
                                    <Text type="success" className="text-xs">
                                        ✓ 已连接到节点 <Text strong>{selection.sourceNodeId}</Text> 的 <Text strong>{selection.sourceOutputKey}</Text> 字段
                                    </Text>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};