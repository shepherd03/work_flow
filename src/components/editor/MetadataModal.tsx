import React from 'react';
import { Modal, Descriptions, Tag, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface MetadataModalProps {
    visible: boolean;
    onClose: () => void;
    nodeData: {
        id: string;
        type: string;
        position: { x: number; y: number };
        data: Record<string, any>;
    };
}

const MetadataModal: React.FC<MetadataModalProps> = ({
    visible,
    onClose,
    nodeData,
}) => {
    const formatValue = (value: any) => {
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    return (
        <Modal
            title={
                <div className="flex items-center space-x-2">
                    <InfoCircleOutlined className="text-blue-500" />
                    <span>节点元数据</span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            className="metadata-modal"
        >
            <div className="space-y-4">
                <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="节点ID" span={1}>
                        <Text code className="text-xs">{nodeData.id}</Text>
                    </Descriptions.Item>

                    <Descriptions.Item label="节点类型" span={1}>
                        <Tag color="blue">{nodeData.type}</Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="位置坐标" span={1}>
                        <Text className="text-xs">
                            X: {nodeData.position.x}, Y: {nodeData.position.y}
                        </Text>
                    </Descriptions.Item>

                    <Descriptions.Item label="创建时间" span={1}>
                        <Text className="text-xs">
                            {new Date().toLocaleString()}
                        </Text>
                    </Descriptions.Item>
                </Descriptions>
            </div>
        </Modal>
    );
};

export default MetadataModal;