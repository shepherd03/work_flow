/**
 * 右键菜单组件
 * 
 * 为工作流节点提供上下文操作菜单，支持：
 * - 节点复制和删除
 * - 节点编辑和设置
 * - 输入节点标记切换
 * - 元数据查看
 * - 智能位置调整（避免超出视窗）
 * 
 * 主要功能：
 * - 上下文操作菜单
 * - 键盘和鼠标事件处理
 * - 位置自适应调整
 * - 节点状态管理
 */
import React, { useEffect, useRef } from 'react';
import { Divider } from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    SettingOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';

interface ContextMenuProps {
    x: number;
    y: number;
    onDelete: () => void;
    onDuplicate: () => void;
    onViewMetadata: () => void;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    onDelete,
    onDuplicate,
    onViewMetadata,
    onClose,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // 确保菜单不会超出视窗边界
    const adjustPosition = () => {
        if (!menuRef.current) return { x, y };

        const rect = { width: 200, height: 180 }; // 预估菜单尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = x;
        let adjustedY = y;

        // 如果菜单会超出右边界，向左调整
        if (x + rect.width > viewportWidth) {
            adjustedX = viewportWidth - rect.width - 10;
        }

        // 如果菜单会超出下边界，向上调整
        if (y + rect.height > viewportHeight) {
            adjustedY = viewportHeight - rect.height - 10;
        }

        // 确保不会超出左边界和上边界
        adjustedX = Math.max(10, adjustedX);
        adjustedY = Math.max(10, adjustedY);

        return { x: adjustedX, y: adjustedY };
    };

    const position = adjustPosition();

    const menuItems = [
        {
            key: 'duplicate',
            label: '复制节点',
            icon: <CopyOutlined />,
            onClick: onDuplicate,
        },
        {
            key: 'divider1',
            type: 'divider',
        },

        {
            key: 'settings',
            label: '节点设置',
            icon: <SettingOutlined />,
            onClick: () => {
                console.log('节点设置');
                onClose();
            },
        },
        {
            key: 'metadata',
            label: '查看元数据',
            icon: <InfoCircleOutlined />,
            onClick: onViewMetadata,
        },
        {
            key: 'divider2',
            type: 'divider',
        },
        {
            key: 'delete',
            label: '删除节点',
            icon: <DeleteOutlined />,
            onClick: onDelete,
            danger: true,
        },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 min-w-48 py-1">
                {menuItems.map((item) => {
                    if (item.type === 'divider') {
                        return <Divider key={item.key} className="my-1" />;
                    }

                    return (
                        <div
                            key={item.key}
                            className={`
                flex items-center px-3 py-2 text-sm cursor-pointer transition-colors duration-150
                hover:bg-gray-50 active:bg-gray-100
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
                            onClick={item.onClick}
                        >
                            <span className="mr-3 text-base">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.key === 'duplicate' && (
                                <span className="text-xs text-gray-400 font-mono">Ctrl+D</span>
                            )}
                            {item.key === 'delete' && (
                                <span className="text-xs text-gray-400 font-mono">Del</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ContextMenu;