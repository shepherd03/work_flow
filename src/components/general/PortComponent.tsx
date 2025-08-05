import React from 'react';
import { Handle, Position } from 'reactflow';

interface PortComponentProps {
    id: string;
    type: 'input' | 'output';
    dataType: string;
}

export const PortComponent: React.FC<PortComponentProps> = ({
    id,
    type,
    dataType
}) => {
    const isInput = type === 'input';

    return (
        <Handle
            type={isInput ? 'target' : 'source'}
            position={isInput ? Position.Left : Position.Right}
            id={id}
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
                data-port-type={type}
                data-port-datatype={dataType}
                cursor-crosshair
            "
            title={`${type} port (${dataType})`}
        />
    );
}; 