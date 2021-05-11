import React from 'react';

function CustomBar(props) {
    const {
        fill,
        x,
        y,
        width,
        height,
    } = props;

    return (
        <rect
            x={x}
            y={y}
            rx={width / 2}
            width={width}
            height={height}
            stroke="none"
            fill={fill}
        />
    );
}

export default CustomBar;
