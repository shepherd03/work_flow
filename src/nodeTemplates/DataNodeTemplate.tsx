import React from 'react';
import { DatabaseOutlined, NumberOutlined, CheckCircleOutlined, UnorderedListOutlined, FileTextOutlined } from '@ant-design/icons';
import { Input, InputNumber, Switch, Tag, Space, Typography, Select, Dropdown, Button, Modal, Form } from 'antd';
import { GeneralNodeWrapper } from '../components/general/GeneralNodeWrapper';
import type { NodeTemplate, Port } from '../types/workflow';
const { Text, Paragraph } = Typography;

export const createStringDataNodeTemplate = (
): NodeTemplate<{
    value: string
}> => {
    return {
        metadata: {
            type: "data-string",
            name: "字符串",
            description: "存储和传递文本数据",
            category: '数据节点',
            icon: React.createElement(DatabaseOutlined),
        },

        initialData: () => ({
            value: ""
        }),

        getPorts: (nodeData) => {
            return {
                input: {
                    id: 'input',
                    dataType: 'string',
                    // 自定义连接规则示例：只允许接受字符串类型
                    connectionRules: {
                        allowedDataTypes: ['string'],
                        customValidation: (sourcePort, targetPort) => {
                            // 可以添加更复杂的验证逻辑
                            if (sourcePort.dataType === 'string' && targetPort.dataType === 'string') {
                                return { allowed: true };
                            }
                            return { allowed: false, message: '字符串端口只能连接字符串类型' };
                        }
                    }
                },
                output: {
                    id: 'output',
                    dataType: 'string',
                    // 自定义连接规则示例：只允许输出到字符串类型
                    connectionRules: {
                        allowedDataTypes: ['string'],
                        customValidation: (sourcePort, targetPort) => {
                            // 可以添加更复杂的验证逻辑
                            if (sourcePort.dataType === 'string' && targetPort.dataType === 'string') {
                                return { allowed: true };
                            }
                            return { allowed: false, message: '字符串端口只能连接到字符串类型' };
                        }
                    }
                },
            };
        },

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (nodeData === undefined || nodeData === null) {
                errors.push('节点数据不能为空');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            return {
                output: nodeData.value,
            };
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
                console.log(`字符串数据节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`字符串数据节点已更新: ${nodeId}`, { oldData, newData });
            },
            onDeleted: (nodeId, nodeData) => {
                console.log(`字符串数据节点已删除: ${nodeId}`, nodeData);
            },
        },

        extensions: {
            category: 'data',
            tags: ['基础', '数据', '字符串'],
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata) => {
            const ports = createStringDataNodeTemplate().getPorts(nodeData);

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-base">
                                    {metadata.icon}
                                </span>
                                <Text strong className="text-sm">
                                    {metadata.name}
                                </Text>
                            </div>
                            <Tag color="blue" className="text-xs">
                                {metadata.type}
                            </Tag>
                        </div>

                        {/* 节点内容 */}
                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <Text type="secondary" className="text-xs leading-relaxed">
                                    {metadata.description}
                                </Text>
                            </div>

                            {/* 字符串输入 */}
                            <div className="space-y-1">
                                <Input
                                    size="small"
                                    value={nodeData.value || ''}
                                    onChange={(e) => onDataChange({
                                        ...nodeData,
                                        value: e.target.value
                                    })}
                                    placeholder="输入字符串..."
                                    className="text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
}

export const createNumberDataNodeTemplate = (
): NodeTemplate<{
    value: number
}> => {
    return {
        metadata: {
            type: "data-number",
            name: "数字",
            description: "存储和传递数值数据",
            category: '数据节点',
            icon: React.createElement(NumberOutlined),
        },

        initialData: () => ({
            value: 0
        }),

        getPorts: (nodeData) => {
            return {
                input: {
                    id: 'input',
                    dataType: 'number',
                },
                output: {
                    id: 'output',
                    dataType: 'number',
                },
            };
        },

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (nodeData === undefined || nodeData === null) {
                errors.push('节点数据不能为空');
            } else if (typeof nodeData.value !== 'number') {
                errors.push('数值必须是数字类型');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            return {
                output: nodeData.value,
            };
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
                console.log(`数字数据节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`数字数据节点已更新: ${nodeId}`, { oldData, newData });
            },
            onDeleted: (nodeId, nodeData) => {
                console.log(`数字数据节点已删除: ${nodeId}`, nodeData);
            },
        },

        extensions: {
            category: 'data',
            tags: ['基础', '数据', '数字'],
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata) => {
            const ports = createNumberDataNodeTemplate().getPorts(nodeData);

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-base">
                                    {metadata.icon}
                                </span>
                                <Text strong className="text-sm">
                                    {metadata.name}
                                </Text>
                            </div>
                            <Tag color="blue" className="text-xs">
                                {metadata.type}
                            </Tag>
                        </div>

                        {/* 节点内容 */}
                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <Text type="secondary" className="text-xs leading-relaxed">
                                    {metadata.description}
                                </Text>
                            </div>

                            {/* 数字输入 */}
                            <div className="space-y-1">
                                <InputNumber
                                    size="small"
                                    value={nodeData.value || 0}
                                    onChange={(value) => onDataChange({
                                        ...nodeData,
                                        value: value || 0
                                    })}
                                    placeholder="输入数字..."
                                    className="w-full text-xs"
                                    min={-999999}
                                    max={999999}
                                />
                            </div>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
}

export const createBooleanDataNodeTemplate = (
): NodeTemplate<{
    value: boolean
}> => {
    return {
        metadata: {
            type: "data-boolean",
            name: "布尔值",
            description: "存储和传递布尔值数据",
            category: '数据节点',
            icon: React.createElement(CheckCircleOutlined),
        },

        initialData: () => ({
            value: false
        }),

        getPorts: (nodeData) => {
            return {
                input: {
                    id: 'input',
                    dataType: 'boolean',
                },
                output: {
                    id: 'output',
                    dataType: 'boolean',
                },
            };
        },

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (nodeData === undefined || nodeData === null) {
                errors.push('节点数据不能为空');
            } else if (typeof nodeData.value !== 'boolean') {
                errors.push('值必须是布尔类型');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            return {
                output: nodeData.value,
            };
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
                console.log(`布尔值数据节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`布尔值数据节点已更新: ${nodeId}`, { oldData, newData });
            },
            onDeleted: (nodeId, nodeData) => {
                console.log(`布尔值数据节点已删除: ${nodeId}`, nodeData);
            },
        },

        extensions: {
            category: 'data',
            tags: ['基础', '数据', '布尔值'],
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata) => {
            const ports = createBooleanDataNodeTemplate().getPorts(nodeData);

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-base">
                                    {metadata.icon}
                                </span>
                                <Text strong className="text-sm">
                                    {metadata.name}
                                </Text>
                            </div>
                            <Tag color="blue" className="text-xs">
                                {metadata.type}
                            </Tag>
                        </div>

                        {/* 节点内容 */}
                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <Text type="secondary" className="text-xs leading-relaxed">
                                    {metadata.description}
                                </Text>
                            </div>

                            {/* 布尔值下拉选择 */}
                            <div className="space-y-1">
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: 'true',
                                                label: '真 (true)',
                                                onClick: () => onDataChange({
                                                    ...nodeData,
                                                    value: true
                                                })
                                            },
                                            {
                                                key: 'false',
                                                label: '假 (false)',
                                                onClick: () => onDataChange({
                                                    ...nodeData,
                                                    value: false
                                                })
                                            }
                                        ]
                                    }}
                                    trigger={['click']}
                                >
                                    <Button
                                        size="small"
                                        className="w-full text-xs text-left"
                                    >
                                        {nodeData.value ? '真 (true)' : '假 (false)'}
                                    </Button>
                                </Dropdown>
                            </div>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
}

export const createArrayDataNodeTemplate = (
): NodeTemplate<{
    value: any[]
}> => {
    return {
        metadata: {
            type: "data-array",
            name: "数组",
            description: "存储和传递数组数据",
            category: '数据节点',
            icon: React.createElement(UnorderedListOutlined),
        },

        initialData: () => ({
            value: []
        }),

        getPorts: (nodeData) => {
            return {
                input: {
                    id: 'input',
                    dataType: 'array',
                },
                output: {
                    id: 'output',
                    dataType: 'array',
                },
            };
        },

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (nodeData === undefined || nodeData === null) {
                errors.push('节点数据不能为空');
            } else if (!Array.isArray(nodeData.value)) {
                errors.push('值必须是数组类型');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            return {
                output: nodeData.value,
            };
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
                console.log(`数组数据节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`数组数据节点已更新: ${nodeId}`, { oldData, newData });
            },
            onDeleted: (nodeId, nodeData) => {
                console.log(`数组数据节点已删除: ${nodeId}`, nodeData);
            },
        },

        extensions: {
            category: 'data',
            tags: ['基础', '数据', '数组'],
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata) => {
            const arrayValue = Array.isArray(nodeData.value) ? nodeData.value : [];
            const [editValue, setEditValue] = React.useState(JSON.stringify(arrayValue, null, 2));
            const [isEditing, setIsEditing] = React.useState(false);
            const ports = createArrayDataNodeTemplate().getPorts(nodeData);

            // 当节点数据变化时，同步更新编辑值
            React.useEffect(() => {
                if (!isEditing) {
                    setEditValue(JSON.stringify(arrayValue, null, 2));
                }
            }, [arrayValue, isEditing]);

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-base">
                                    {metadata.icon}
                                </span>
                                <Text strong className="text-sm">
                                    {metadata.name}
                                </Text>
                            </div>
                            <Tag color="blue" className="text-xs">
                                {metadata.type}
                            </Tag>
                        </div>

                        {/* 节点内容 */}
                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <Text type="secondary" className="text-xs leading-relaxed">
                                    {metadata.description}
                                </Text>
                            </div>

                            {/* 数组信息 */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Text type="secondary" className="text-xs">
                                        数组长度:
                                    </Text>
                                    <Tag color="green" className="text-xs">
                                        {arrayValue.length}
                                    </Tag>
                                </div>
                                {/* 数组编辑区域 */}
                                <div className="space-y-1">
                                    <Text type="secondary" className="text-xs">
                                        数组内容 (JSON格式):
                                    </Text>
                                    <Input.TextArea
                                        size="small"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onFocus={() => {
                                            setIsEditing(true);
                                        }}
                                        onBlur={() => {
                                            setIsEditing(false);
                                            try {
                                                const parsedValue = JSON.parse(editValue);
                                                if (Array.isArray(parsedValue)) {
                                                    onDataChange({
                                                        ...nodeData,
                                                        value: parsedValue
                                                    });
                                                } else {
                                                    // 不是数组，恢复到原始值
                                                    setEditValue(JSON.stringify(arrayValue, null, 2));
                                                }
                                            } catch (error) {
                                                // 解析错误时恢复到原始值
                                                setEditValue(JSON.stringify(arrayValue, null, 2));
                                            }
                                        }}
                                        placeholder="例如: [1, 2, 3] 或 ['a', 'b', 'c']"
                                        className="text-xs"
                                        rows={4}
                                        style={{ fontSize: '10px', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
}

export const createObjectDataNodeTemplate = (
): NodeTemplate<{
    value: Record<string, any>
}> => {
    return {
        metadata: {
            type: "data-object",
            name: "对象",
            description: "存储和传递对象数据",
            category: '数据节点',
            icon: React.createElement(FileTextOutlined),
        },

        initialData: () => ({
            value: {}
        }),

        getPorts: (nodeData) => {
            return {
                input: {
                    id: 'input',
                    dataType: 'object',
                },
                output: {
                    id: 'output',
                    dataType: 'object',
                },
            };
        },

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (nodeData === undefined || nodeData === null) {
                errors.push('节点数据不能为空');
            } else if (typeof nodeData.value !== 'object' || Array.isArray(nodeData.value)) {
                errors.push('值必须是对象类型');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            return {
                output: nodeData.value,
            };
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
                console.log(`对象数据节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`对象数据节点已更新: ${nodeId}`, { oldData, newData });
            },
            onDeleted: (nodeId, nodeData) => {
                console.log(`对象数据节点已删除: ${nodeId}`, nodeData);
            },
        },

        extensions: {
            category: 'data',
            tags: ['基础', '数据', '对象'],
        },

        renderInEditor: (nodeData, isSelected, onDataChange, metadata) => {
            const objectValue = nodeData.value && typeof nodeData.value === 'object' && !Array.isArray(nodeData.value)
                ? nodeData.value
                : {};
            const keyCount = Object.keys(objectValue).length;
            const [editValue, setEditValue] = React.useState(JSON.stringify(objectValue, null, 2));
            const [isEditing, setIsEditing] = React.useState(false);
            const ports = createObjectDataNodeTemplate().getPorts(nodeData);

            // 当节点数据变化时，同步更新编辑值
            React.useEffect(() => {
                if (!isEditing) {
                    setEditValue(JSON.stringify(objectValue, null, 2));
                }
            }, [objectValue, isEditing]);

            return (
                <GeneralNodeWrapper inputPort={ports.input} outputPort={ports.output}>
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-base">
                                    {metadata.icon}
                                </span>
                                <Text strong className="text-sm">
                                    {metadata.name}
                                </Text>
                            </div>
                            <Tag color="blue" className="text-xs">
                                {metadata.type}
                            </Tag>
                        </div>

                        {/* 节点内容 */}
                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <Text type="secondary" className="text-xs leading-relaxed">
                                    {metadata.description}
                                </Text>
                            </div>

                            {/* 对象信息 */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Text type="secondary" className="text-xs">
                                        属性数量:
                                    </Text>
                                    <Tag color="green" className="text-xs">
                                        {keyCount}
                                    </Tag>
                                </div>
                                {/* 对象编辑区域 */}
                                <div className="space-y-1">
                                    <Text type="secondary" className="text-xs">
                                        对象内容 (JSON格式):
                                    </Text>
                                    <Input.TextArea
                                        size="small"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onFocus={() => {
                                            setIsEditing(true);
                                        }}
                                        onBlur={() => {
                                            setIsEditing(false);
                                            try {
                                                const parsedValue = JSON.parse(editValue);
                                                if (typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
                                                    onDataChange({
                                                        ...nodeData,
                                                        value: parsedValue
                                                    });
                                                } else {
                                                    // 不是对象，恢复到原始值
                                                    setEditValue(JSON.stringify(objectValue, null, 2));
                                                }
                                            } catch (error) {
                                                // 解析错误时恢复到原始值
                                                setEditValue(JSON.stringify(objectValue, null, 2));
                                            }
                                        }}
                                        placeholder="例如: {'name': 'value', 'number': 123}"
                                        className="text-xs"
                                        rows={4}
                                        style={{ fontSize: '10px', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
}

export const stringDataTemplate = createStringDataNodeTemplate();
export const numberDataTemplate = createNumberDataNodeTemplate();
export const booleanDataTemplate = createBooleanDataNodeTemplate();
export const arrayDataTemplate = createArrayDataNodeTemplate();
export const objectDataTemplate = createObjectDataNodeTemplate();