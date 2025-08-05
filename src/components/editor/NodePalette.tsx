/**
 * 节点面板组件
 * 
 * 提供可拖拽的节点库界面，允许用户：
 * - 浏览所有可用的节点类型
 * - 按分类查看节点
 * - 搜索特定节点
 * - 拖拽节点到工作流画布
 * 
 * 主要功能：
 * - 节点分类展示
 * - 节点搜索过滤
 * - 拖拽创建节点
 * - 节点信息预览
 */
import React, { useState, useEffect } from 'react';
import { Card, Typography, Badge, Collapse, Space, Input } from 'antd';
import { DatabaseOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { NodeRegistry, NodeTemplate } from '../../types/workflow';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

interface NodePaletteProps {
    nodeRegistry: NodeRegistry;
}

const NodePalette: React.FC<NodePaletteProps> = ({ nodeRegistry }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Record<string, NodeTemplate<any>[]>>({});

    // 获取所有节点模板并按分类组织
    useEffect(() => {
        const updateCategories = () => {
            const allTemplates = nodeRegistry.getAll();
            const filteredTemplates = searchQuery
                ? nodeRegistry.search(searchQuery)
                : allTemplates;

            const categoryMap: Record<string, NodeTemplate<any>[]> = {};
            filteredTemplates.forEach((template: NodeTemplate<any>) => {
                if (!categoryMap[template.metadata.category]) {
                    categoryMap[template.metadata.category] = [];
                }
                categoryMap[template.metadata.category].push(template);
            });

            setCategories(categoryMap);
        };

        updateCategories();
    }, [nodeRegistry, searchQuery]);

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const getNodeColor = (template: NodeTemplate<any>): string => {
        return template.styling?.iconColor || '#3b82f6';
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <DatabaseOutlined className="text-blue-500" />
                        <Title level={4} className="m-0">
                            节点库
                        </Title>
                    </div>
                    <PlusOutlined className="text-gray-400 cursor-pointer hover:text-blue-500" />
                </div>

                <Search
                    placeholder="搜索节点..."
                    allowClear
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-2"
                    size="small"
                />

                <Text type="secondary" className="text-xs block">
                    拖拽节点到画布创建 • 共 {nodeRegistry.getAll().length} 个节点
                </Text>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {Object.keys(categories).length === 0 ? (
                    <div className="text-center py-8">
                        <Text type="secondary">
                            {searchQuery ? '未找到匹配的节点' : '暂无可用节点'}
                        </Text>
                    </div>
                ) : (
                    <Collapse
                        defaultActiveKey={Object.keys(categories)}
                        ghost
                        className="bg-transparent"
                    >
                        {Object.entries(categories).map(([categoryName, templates]) => (
                            <Panel
                                key={categoryName}
                                header={
                                    <div className="flex items-center justify-between">
                                        <Text className="font-medium text-gray-700">
                                            {categoryName}
                                        </Text>
                                        <Badge count={templates.length} size="small" />
                                    </div>
                                }
                                className="border-none"
                            >
                                <div className="space-y-2 pt-2">
                                    {templates.map((template) => (
                                        <Card
                                            key={template.metadata.type}
                                            size="small"
                                            className="cursor-grab border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 active:cursor-grabbing active:scale-95"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, template.metadata.type)}
                                            styles={{
                                                body: { padding: '8px 12px' }
                                            }}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm"
                                                    style={{ backgroundColor: getNodeColor(template) }}
                                                >
                                                    {template.metadata.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium text-sm text-gray-800 truncate">
                                                            {template.metadata.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {template.metadata.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </Panel>
                        ))}
                    </Collapse>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <Text type="secondary" className="text-xs text-center block">
                    💡 提示：拖拽节点到画布，右键标记为输入节点
                </Text>
            </div>
        </div>
    );
};

export default NodePalette;