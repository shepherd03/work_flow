import React from 'react';
import { Handle, Position } from 'reactflow';

interface GeneralNodeWrapperProps {
    children: React.ReactNode;
    hasInput?: boolean;   // 是否显示输入连接点
    hasOutput?: boolean;  // 是否显示输出连接点
    hasLoopBodyOutput?: boolean; // 是否显示循环体输出连接点（下方）
}

export const GeneralNodeWrapper: React.FC<GeneralNodeWrapperProps> = ({
    children,
    hasInput = true,
    hasOutput = true,
    hasLoopBodyOutput = false
}) => {
    return (
        <div className={`
            bg-white 
            rounded-lg 
            p-3 
            min-w-[200px] 
            max-w-[280px]
            cursor-pointer
            select-none
            relative
        `}>
            {/* 输入连接点 */}
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input"
                    className="
                        w-3 
                        h-3 
                        bg-gradient-to-br from-blue-400 to-blue-600
                        border-2 
                        border-white 
                        shadow-lg
                        hover:scale-110
                        hover:from-blue-500
                        hover:to-blue-700
                        hover:shadow-xl
                        transition-all
                        duration-200
                        ease-out
                        cursor-crosshair
                    "
                />
            )}

            {/* 节点内容 */}
            {children}

            {/* 输出连接点 */}
            {hasOutput && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output"
                    className="
                        w-3 
                        h-3 
                        bg-gradient-to-br from-green-400 to-green-600
                        border-2 
                        border-white 
                        shadow-lg
                        hover:scale-110
                        hover:from-green-500
                        hover:to-green-700
                        hover:shadow-xl
                        transition-all
                        duration-200
                        ease-out
                        cursor-crosshair
                    "
                />
            )}

            {/* 循环体输出连接点（下方） */}
            {hasLoopBodyOutput && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="loop-body"
                    className="
                        w-4 
                        h-3 
                        bg-gradient-to-br from-purple-400 to-purple-600
                        border-2 
                        border-white 
                        shadow-lg
                        hover:scale-110
                        hover:from-purple-500
                        hover:to-purple-700
                        hover:shadow-xl
                        transition-all
                        duration-200
                        ease-out
                        cursor-crosshair
                        rounded-t-none
                        rounded-b-md
                    "
                    style={{
                        bottom: '-8px'
                    }}
                />
            )}
        </div>
    );
};