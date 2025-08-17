import React from 'react';
import { StopOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { Input, Tag, Typography, Select, Switch, Card, Divider } from 'antd';
import { GeneralNodeWrapper } from '../components/general/GeneralNodeWrapper';
import type { NodeTemplate } from '../types/workflow';

const { Text, Title } = Typography;

// 输出格式配置
interface OutputFormat {
    type: 'json' | 'text' | 'table' | 'custom';
    customTemplate?: string; // 自定义模板，支持变量替换
}

// 结束节点数据结构
interface EndNodeData {
    metadata?: {
        name?: string;
    };
    parameterSelections?: Record<string, any>;
    outputFormat: OutputFormat;
    showPreview: boolean; // 是否在节点中预览输出
    saveToFile: boolean;  // 是否保存到文件
    fileName?: string;    // 保存的文件名
}

/**
 * 创建结束节点模板
 * 结束节点是工作流的终点，负责：
 * 1. 接收工作流的最终数据
 * 2. 格式化输出数据
 * 3. 标记工作流执行完成
 * 4. 只有输入端口，没有输出端口
 */
export const createEndNodeTemplate = (): NodeTemplate<EndNodeData> => {
    return {
        metadata: {
            type: "workflow-end",
            name: "结束",
            description: "工作流的结束节点，处理最终输出",
            category: '工作流控制',
            icon: React.createElement(StopOutlined),
        },

        // 结束节点需要从上游获取数据
        inputFields: [
            {
                key: 'finalData',
                name: '最终数据',
                type: 'any',
                required: true,
                description: '工作流的最终输出数据'
            }
        ],

        validate: (nodeData) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            // 检查输入字段是否有有效的上游连接
            if (!nodeData.parameterSelections || !nodeData.parameterSelections.finalData) {
                errors.push('结束节点需要连接上游数据源');
            } else {
                const finalDataSelection = nodeData.parameterSelections.finalData;
                if (finalDataSelection.source === 'upstream' &&
                    (!finalDataSelection.sourceNodeId || !finalDataSelection.sourceOutputKey)) {
                    errors.push('最终数据参数必须选择有效的上游数据源');
                }
            }

            if (nodeData.saveToFile && (!nodeData.fileName || nodeData.fileName.trim() === '')) {
                errors.push('保存到文件时，文件名不能为空');
            }

            if (nodeData.outputFormat.type === 'custom' &&
                (!nodeData.outputFormat.customTemplate || nodeData.outputFormat.customTemplate.trim() === '')) {
                errors.push('自定义输出格式时，模板不能为空');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        execute: async (inputs, nodeData, context) => {
            const inputData = inputs || {};

            // 根据格式配置处理输出
            let formattedOutput: string;

            switch (nodeData.outputFormat.type) {
                case 'json':
                    formattedOutput = JSON.stringify(inputData, null, 2);
                    break;
                case 'text':
                    formattedOutput = String(inputData);
                    break;
                case 'table':
                    if (Array.isArray(inputData)) {
                        formattedOutput = JSON.stringify(inputData, null, 2);
                    } else {
                        formattedOutput = Object.entries(inputData)
                            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                            .join('\n');
                    }
                    break;
                case 'custom':
                    // 简单的模板替换
                    formattedOutput = nodeData.outputFormat.customTemplate || '';
                    Object.entries(inputData).forEach(([key, value]) => {
                        formattedOutput = formattedOutput.replace(
                            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                            JSON.stringify(value)
                        );
                    });
                    break;
                default:
                    formattedOutput = JSON.stringify(inputData, null, 2);
            }

            context.logger?.info(`工作流执行完成，最终输出: ${formattedOutput}`);

            // 如果配置了保存到文件，这里可以触发保存操作
            if (nodeData.saveToFile && nodeData.fileName) {
                context.logger?.info(`准备保存到文件: ${nodeData.fileName}`);
                // 这里可以添加实际的文件保存逻辑
            }

            return {
                finalOutput: formattedOutput,
                rawInput: inputData,
                completed: true
            };
        },

        behavior: {
            resizable: true,
            deletable: false, // 结束节点不能删除
            copyable: false,  // 结束节点不能复制
            editable: true,
            connectable: true,
        },

        hooks: {
            onCreated: (nodeId, nodeData) => {
                console.log(`结束节点已创建: ${nodeId}`, nodeData);
            },
            onUpdated: (nodeId, oldData, newData) => {
                console.log(`结束节点已更新: ${nodeId}`, { oldData, newData });
            },
        },

        extensions: {
            category: 'control',
            tags: ['结束', '控制', '输出'],
            isEndNode: true, // 标识这是结束节点
        },

        renderInEditor: (nodeData, _isSelected, onDataChange, metadata, _context) => {
            return (
                <GeneralNodeWrapper
                    hasInput={true}
                    hasOutput={false} // 结束节点没有输出连接点
                >
                    <div className="space-y-3">
                        {/* 节点头部 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-red-600 text-lg">
                                    {metadata.icon}
                                </span>
                                <Title level={5} className="m-0 text-sm text-red-600">
                                    {metadata.name}
                                </Title>
                            </div>
                            <Tag color="red" className="text-xs">
                                结束节点
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
                                placeholder="输入节点名称..."
                                className="text-xs mt-1 w-full"
                            />
                        </div>

                        <Divider className="my-3" />

                        {/* 输出格式配置 */}
                        <div className="space-y-2">
                            <Text strong className="text-xs">输出格式配置</Text>

                            <div>
                                <Text type="secondary" className="text-xs block mb-1">输出格式:</Text>
                                <Select
                                    size="small"
                                    value={nodeData.outputFormat.type}
                                    onChange={(value) => onDataChange({
                                        ...nodeData,
                                        outputFormat: {
                                            ...nodeData.outputFormat,
                                            type: value
                                        }
                                    })}
                                    className="w-full"
                                    dropdownStyle={{ fontSize: '12px' }}
                                    options={[
                                        { value: 'json', label: 'JSON格式' },
                                        { value: 'text', label: '纯文本' },
                                        { value: 'table', label: '表格格式' },
                                        { value: 'custom', label: '自定义模板' },
                                    ]}
                                />
                            </div>

                            {/* 自定义模板 */}
                            {nodeData.outputFormat.type === 'custom' && (
                                <div>
                                    <Text type="secondary" className="text-xs block">自定义模板:</Text>
                                    <Input.TextArea
                                        size="small"
                                        value={nodeData.outputFormat.customTemplate || ''}
                                        onChange={(e) => onDataChange({
                                            ...nodeData,
                                            outputFormat: {
                                                ...nodeData.outputFormat,
                                                customTemplate: e.target.value
                                            }
                                        })}
                                        placeholder="使用 {{变量名}} 来引用输入数据\n例如: 处理结果: {{result}}\n状态: {{status}}"
                                        className="text-xs mt-1"
                                        rows={3}
                                        style={{ fontSize: '10px', fontFamily: 'monospace' }}
                                    />
                                    <Text type="secondary" className="text-xs">
                                        提示: 使用 {`{{变量名}}`} 来引用输入数据中的字段
                                    </Text>
                                </div>
                            )}
                        </div>

                        <Divider className="my-3" />

                        {/* 显示和保存选项 */}
                        <div className="space-y-2">
                            <Text strong className="text-xs">输出选项</Text>

                            <div className="flex items-center justify-between">
                                <Text type="secondary" className="text-xs">预览输出:</Text>
                                <Switch
                                    size="small"
                                    checked={nodeData.showPreview}
                                    onChange={(checked) => onDataChange({
                                        ...nodeData,
                                        showPreview: checked
                                    })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Text type="secondary" className="text-xs">保存到文件:</Text>
                                <Switch
                                    size="small"
                                    checked={nodeData.saveToFile}
                                    onChange={(checked) => onDataChange({
                                        ...nodeData,
                                        saveToFile: checked
                                    })}
                                />
                            </div>

                            {nodeData.saveToFile && (
                                <div>
                                    <Text type="secondary" className="text-xs block">文件名:</Text>
                                    <Input
                                        size="small"
                                        value={nodeData.fileName || ''}
                                        onChange={(e) => onDataChange({
                                            ...nodeData,
                                            fileName: e.target.value
                                        })}
                                        placeholder="workflow_output.json"
                                        className="text-xs mt-1"
                                        addonBefore={<DownloadOutlined />}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 预览区域 */}
                        {nodeData.showPreview && (
                            <>
                                <Divider className="my-3" />
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-1">
                                        <EyeOutlined className="text-xs" />
                                        <Text type="secondary" className="text-xs">输出预览:</Text>
                                    </div>
                                    <Card
                                        size="small"
                                        className="bg-gray-50 border-gray-200"
                                        bodyStyle={{ padding: '8px' }}
                                    >
                                        <Text className="text-xs text-gray-600" style={{ fontFamily: 'monospace' }}>
                                            工作流执行完成后，输出将在此显示
                                        </Text>
                                    </Card>
                                </div>
                            </>
                        )}

                        {/* 节点状态 */}
                        <div className="bg-red-50 p-2 rounded">
                            <Text type="secondary" className="text-xs">
                                工作流终点 - 格式:
                                <Tag color="red" className="text-xs ml-1">
                                    {nodeData.outputFormat.type.toUpperCase()}
                                </Tag>
                            </Text>
                        </div>
                    </div>
                </GeneralNodeWrapper>
            );
        },
    };
};

export const endNodeTemplate = createEndNodeTemplate();
