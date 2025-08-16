import React from 'react';
import { PlayCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Input, Button, Tag, Typography, Select, Popconfirm, Card, Divider } from 'antd';
import { GeneralNodeWrapper } from '../components/general/GeneralNodeWrapper';
import type { NodeTemplate } from '../types/workflow';

const { Text, Title } = Typography;

// 数据字段配置接口
interface DataField {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    defaultValue: any;
    description?: string;
}

// 开始节点数据结构
interface StartNodeData {
    fields: DataField[];
    name: string;
}

/**
 * 创建开始节点模板
 * 开始节点是工作流的起始点，负责：
 * 1. 配置工作流需要的输入数据字段
 * 2. 在工作流执行时提供初始数据
 * 3. 只有输出端口，没有输入端口
 */
export const createStartNodeTemplate = (): NodeTemplate<StartNodeData> => {
    return {
        metadata: {
            type: "workflow-start",
            name: "开始",
            description: "工作流的起始节点，配置输入数据",
            category: '工作流控制',
            icon: React.createElement(PlayCircleOutlined),
        },

        initialData: () => ({
            fields: [
                {
                    name: 'input',
                    type: 'string',
                    defaultValue: '',
                    description: '默认输入字段'
                }
            ],
            name: '开始节点'
        }),

        getPorts: () => {
            return {
                input: {
                    id: 'input',
                    dataType: 'none', // 开始节点没有输入
                },
                output: {
                    id: 'output',
                    dataType: 'object', // 输出为包含所有配置字段的对象
                },
            };
        },

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!nodeData.fields || nodeData.fields.length === 0) {
                errors.push('至少需要配置一个数据字段');
            }

            // 检查字段名是否重复
            const fieldNames = nodeData.fields.map(f => f.name);
            const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
            if (duplicateNames.length > 0) {
                errors.push(`存在重复的字段名: ${duplicateNames.join(', ')}`);
            }

            // 检查字段名是否有效
            nodeData.fields.forEach(field => {
                if (!field.name || field.name.trim() === '') {
                    errors.push('字段名不能为空');
                }
                if (field.name && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field.name)) {
                    errors.push(`字段名 "${field.name}" 不是有效的标识符`);
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (_inputs: any, nodeData, context) => {
            // 开始节点执行时，返回配置的字段和其默认值
            const result: Record<string, any> = {};

            nodeData.fields.forEach(field => {
                result[field.name] = field.defaultValue;
            });

            context.logger?.info(`开始节点执行，输出数据: ${JSON.stringify(result)}`);

            return {
                output: result,
            };
        },

        behavior: {
            resizable: true,
            deletable: false, // 开始节点不能删除
            copyable: false,  // 开始节点不能复制
            editable: true,
            connectable: true,
        },

        hooks: {
            onCreated: (nodeId, nodeData) => {
                console.log(`开始节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`开始节点已更新: ${nodeId}`, { oldData, newData });
            },
        },

        extensions: {
            category: 'control',
            tags: ['开始', '控制', '输入'],
            isStartNode: true, // 标识这是开始节点
        },

        renderInEditor: (nodeData, _isSelected, onDataChange, metadata, _context) => {
            const ports = createStartNodeTemplate().getPorts(nodeData);

            const getDefaultValue = (type: string) => {
                switch (type) {
                    case 'string': return '';
                    case 'number': return 0;
                    case 'boolean': return false;
                    case 'array': return [];
                    case 'object': return {};
                    default: return '';
                }
            };

            const addField = () => {
                const newField: DataField = {
                    name: `field_${nodeData.fields.length + 1}`,
                    type: 'string',
                    defaultValue: getDefaultValue('string'),
                    description: ''
                };
                onDataChange({
                    ...nodeData,
                    fields: [...nodeData.fields, newField]
                });
            };

            const removeField = (index: number) => {
                const newFields = nodeData.fields.filter((_, i) => i !== index);
                onDataChange({
                    ...nodeData,
                    fields: newFields
                });
            };

            const updateField = (index: number, updatedField: Partial<DataField>) => {
                const newFields = nodeData.fields.map((field, i) =>
                    i === index ? { ...field, ...updatedField } : field
                );
                onDataChange({
                    ...nodeData,
                    fields: newFields
                });
            };

            const updateFieldType = (index: number, newType: DataField['type']) => {
                const newDefaultValue = getDefaultValue(newType);
                updateField(index, {
                    type: newType,
                    defaultValue: newDefaultValue
                });
            };

            return (
                <GeneralNodeWrapper
                    inputPort={undefined} // 开始节点没有输入端口
                    outputPort={ports.output}
                >
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-green-600 text-lg">
                                    {metadata.icon}
                                </span>
                                <Title level={5} className="m-0 text-sm text-green-600">
                                    {metadata.name}
                                </Title>
                            </div>
                            <Tag color="green" className="text-xs">
                                起始节点
                            </Tag>
                        </div>

                        {/* 节点名称 */}
                        <div>
                            <Text type="secondary" className="text-xs">节点名称:</Text>
                            <Input
                                size="small"
                                value={nodeData.name}
                                onChange={(e) => onDataChange({
                                    ...nodeData,
                                    name: e.target.value
                                })}
                                placeholder="输入节点名称..."
                                className="text-xs mt-1 w-full"
                            />
                        </div>

                        <Divider className="my-3" />

                        {/* 数据字段配置 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Text strong className="text-xs">输入字段配置</Text>
                                <Button
                                    type="dashed"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={addField}
                                    className="text-xs"
                                >
                                    添加字段
                                </Button>
                            </div>

                            {nodeData.fields.map((field, index) => (
                                <Card
                                    key={index}
                                    size="small"
                                    className="bg-gray-50 border-gray-200"
                                    bodyStyle={{ padding: '8px' }}
                                >
                                    <div className="space-y-2">
                                        {/* 字段名和类型 */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Text type="secondary" className="text-xs block">字段名:</Text>
                                                <Input
                                                    size="small"
                                                    value={field.name}
                                                    onChange={(e) => updateField(index, { name: e.target.value })}
                                                    placeholder="字段名"
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Text type="secondary" className="text-xs block mb-1">类型:</Text>
                                                <Select
                                                    size="small"
                                                    value={field.type}
                                                    onChange={(value) => updateFieldType(index, value)}
                                                    className="w-full"
                                                    dropdownStyle={{ fontSize: '12px' }}
                                                    options={[
                                                        { value: 'string', label: '文本' },
                                                        { value: 'number', label: '数字' },
                                                        { value: 'boolean', label: '布尔' },
                                                        { value: 'array', label: '数组' },
                                                        { value: 'object', label: '对象' },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        {/* 默认值 */}
                                        <div>
                                            <Text type="secondary" className="text-xs block">默认值:</Text>
                                            {field.type === 'string' && (
                                                <Input
                                                    size="small"
                                                    value={field.defaultValue || ''}
                                                    onChange={(e) => updateField(index, { defaultValue: e.target.value })}
                                                    placeholder="默认文本值"
                                                    className="text-xs"
                                                />
                                            )}
                                            {field.type === 'number' && (
                                                <Input
                                                    size="small"
                                                    type="number"
                                                    value={field.defaultValue || 0}
                                                    onChange={(e) => updateField(index, { defaultValue: Number(e.target.value) || 0 })}
                                                    placeholder="默认数字值"
                                                    className="text-xs"
                                                />
                                            )}
                                            {field.type === 'boolean' && (
                                                <Select
                                                    size="small"
                                                    value={field.defaultValue}
                                                    onChange={(value) => updateField(index, { defaultValue: value })}
                                                    className="w-full"
                                                    dropdownStyle={{ fontSize: '12px' }}
                                                    options={[
                                                        { value: true, label: '真 (true)' },
                                                        { value: false, label: '假 (false)' },
                                                    ]}
                                                />
                                            )}
                                            {(field.type === 'array' || field.type === 'object') && (
                                                <Input.TextArea
                                                    size="small"
                                                    value={JSON.stringify(field.defaultValue, null, 2)}
                                                    onChange={(e) => {
                                                        try {
                                                            const parsed = JSON.parse(e.target.value);
                                                            updateField(index, { defaultValue: parsed });
                                                        } catch (error) {
                                                            // 如果JSON格式错误，暂时不更新
                                                        }
                                                    }}
                                                    placeholder={field.type === 'array' ? '[1, 2, 3]' : '{"key": "value"}'}
                                                    className="text-xs"
                                                    rows={2}
                                                    style={{ fontSize: '10px', fontFamily: 'monospace' }}
                                                />
                                            )}
                                        </div>

                                        {/* 字段描述和删除按钮 */}
                                        <div className="flex items-end space-x-2">
                                            <div className="flex-1">
                                                <Text type="secondary" className="text-xs block">描述:</Text>
                                                <Input
                                                    size="small"
                                                    value={field.description || ''}
                                                    onChange={(e) => updateField(index, { description: e.target.value })}
                                                    placeholder="字段描述 (可选)"
                                                    className="text-xs"
                                                />
                                            </div>
                                            {nodeData.fields.length > 1 && (
                                                <Popconfirm
                                                    title="确定删除这个字段吗？"
                                                    onConfirm={() => removeField(index)}
                                                    okText="确定"
                                                    cancelText="取消"
                                                >
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<DeleteOutlined />}
                                                        className="text-red-500 hover:text-red-600"
                                                    />
                                                </Popconfirm>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* 字段统计 */}
                        <div className="bg-green-50 p-2 rounded">
                            <Text type="secondary" className="text-xs">
                                已配置 <Tag color="green" className="text-xs">{nodeData.fields.length}</Tag> 个输入字段
                            </Text>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
};

export const startNodeTemplate = createStartNodeTemplate();
