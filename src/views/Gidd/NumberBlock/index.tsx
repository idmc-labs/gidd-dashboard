import React, { memo } from 'react';
import {
    _cs,
    isNotDefined,
} from '@togglecorp/fujs';
import {
    Numeral,
    useCounter,
} from '@togglecorp/toggle-ui';

import styles from './styles.css';

function NumberBlock({
    label,
    secondarySubLabel,
    subLabel,
    value,
    className,
    variant = 'normal',
    size = 'small',
    hideIfNoValue = false,
    abbreviate = true,
}: {
    label: string;
    secondarySubLabel?: string;
    subLabel?: string;
    value: number | null | undefined;
    className?: string;
    variant?: 'conflict' | 'normal' | 'disaster';
    size?: 'large' | 'medium' | 'small';
    hideIfNoValue?: boolean;
    abbreviate?: boolean;
}) {
    const counterValue = useCounter(value, 600, 'exp');
    if (isNotDefined(value) && hideIfNoValue) {
        return null;
    }

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
                value={counterValue}
                placeholder="N/a"
                abbreviate={abbreviate}
            />
            <div className={styles.label}>
                { label }
            </div>
            {secondarySubLabel && (
                <div className={styles.label}>
                    { secondarySubLabel }
                </div>
            )}
            {subLabel && (
                <div className={styles.subLabel}>
                    { subLabel }
                </div>
            )}
        </div>
    );
}

export default memo(NumberBlock);
