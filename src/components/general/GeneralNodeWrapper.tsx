import React from 'react';
import { PortComponent } from './PortComponent';
import type { Port } from '../../types/workflow';

interface GeneralNodeWrapperProps {
    children: React.ReactNode;
    inputPort?: Port;
    outputPort?: Port;
}

export const GeneralNodeWrapper: React.FC<GeneralNodeWrapperProps> = ({
    children,
    inputPort,
    outputPort
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
            {/* 输入端口 */}
            {inputPort && inputPort.dataType !== 'none' && (
                <PortComponent
                    id={inputPort.id}
                    type="input"
                    dataType={inputPort.dataType}
                />
            )}

            {/* 节点内容 */}
            {children}

            {/* 输出端口 */}
            {outputPort && outputPort.dataType !== 'none' && (
                <PortComponent
                    id={outputPort.id}
                    type="output"
                    dataType={outputPort.dataType}
                />
            )}
        </div>
    );
};