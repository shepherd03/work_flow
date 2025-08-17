import React from 'react';
import { Tag } from 'antd';
import { InfoCircleOutlined, TagOutlined } from '@ant-design/icons';
import type { NodeMetadata } from '../../types/workflow';
import { GeneralNodeWrapper } from '../general/GeneralNodeWrapper';

interface DefaultNodeProps {
    nodeData: any;
    isSelected: boolean;
    onDataChange: (data: any) => void;
    metadata: NodeMetadata;
    hasInput?: boolean;
    hasOutput?: boolean;
}

export const DefaultNode: React.FC<DefaultNodeProps> = ({
    nodeData,
    isSelected,
    onDataChange,
    metadata,
    hasInput = true,
    hasOutput = true
}) => {
    return (
        <GeneralNodeWrapper hasInput={hasInput} hasOutput={hasOutput}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    {metadata.icon && (
                        <span className="text-blue-600 text-base">
                            {metadata.icon}
                        </span>
                    )}
                    <h5 className="text-sm font-medium text-gray-900 m-0">
                        {metadata.name}
                    </h5>
                </div>
                <Tag color="blue" className="text-xs">
                    {metadata.type}
                </Tag>
            </div>

            {/* 节点内容 */}
            <div className="space-y-2">
                {/* 描述信息 */}
                {metadata.description && (
                    <div className="flex items-start space-x-2">
                        <InfoCircleOutlined className="text-gray-400 text-xs mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-500 leading-relaxed break-words">
                            {metadata.description}
                        </span>
                    </div>
                )}

                {/* 分类信息 */}
                <div className="flex items-center space-x-2">
                    <TagOutlined className="text-gray-400 text-xs flex-shrink-0" />
                    <span className="text-xs text-gray-500">
                        分类: {metadata.category}
                    </span>
                </div>
            </div>
        </GeneralNodeWrapper>
    );
};