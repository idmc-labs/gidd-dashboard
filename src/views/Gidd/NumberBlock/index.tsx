import React from 'react';
import { _cs } from '@togglecorp/fujs';
import { Numeral } from '@togglecorp/toggle-ui';

import styles from './styles.css';

function NumberBlock({
    label,
    subLabel,
    value,
    className,
    variant = 'normal',
    size = 'small',
}: {
    label: string;
    subLabel?: string;
    value: number | null | undefined;
    className?: string;
    variant?: 'conflict' | 'normal' | 'disaster';
    size?: 'large' | 'medium' | 'small';
}) {
    return (
        <div
            className={_cs(
                styles.numberBlock,
                className,
                styles[variant],
                styles[size],
            )}
        >
            <Numeral
                className={styles.value}
                value={value}
                placeholder="N/a"
                abbreviate
            />
            <div className={styles.label}>
                { label }
            </div>
            {subLabel && (
                <div className={styles.subLabel}>
                    { subLabel }
                </div>
            )}
        </div>
    );
}

export default NumberBlock;
