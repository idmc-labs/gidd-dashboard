import React from 'react';
import { _cs } from '@togglecorp/fujs';

import styles from './styles.css';

export interface TextProps {
    className?: string;
    value: string | undefined | null;
    tooltip?: string | undefined | null;
}

function Text(props: TextProps) {
    const {
        className,
        value,
        tooltip,
    } = props;

    return (
        <div
            className={_cs(styles.text, className)}
            title={tooltip ?? value ?? ''}
        >
            { value }
        </div>
    );
}

export default Text;
