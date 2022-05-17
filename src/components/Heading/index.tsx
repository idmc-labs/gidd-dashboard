import React from 'react';
import { _cs } from '@togglecorp/fujs';

import styles from './styles.css';

export type HeadingSizeType = 'extraSmall' | 'small' | 'medium' | 'large' | 'extraLarge';

interface Props {
    className?: string;
    children?: React.ReactNode;
    size?: HeadingSizeType;
    hideBorder?: boolean;
}

function Heading(props: Props) {
    const {
        className,
        children: childrenFromProps,
        size = 'medium',
        hideBorder = false,
    } = props;

    const children: React.ReactNode = React.useMemo(() => {
        if (size === 'extraLarge' || size === 'large') {
            return (
                <>
                    {childrenFromProps}
                    {!hideBorder && (
                        <div className={styles.border} />
                    )}
                </>
            );
        }

        return childrenFromProps;
    }, [
        size,
        childrenFromProps,
        hideBorder,
    ]);

    return (
        <>
            {size === 'extraSmall' && (
                <h5 className={_cs(styles.heading, styles.extraSmall, className)}>
                    { children }
                </h5>
            )}
            {size === 'small' && (
                <h4 className={_cs(styles.heading, styles.small, className)}>
                    { children }
                </h4>
            )}
            {size === 'medium' && (
                <h3 className={_cs(styles.heading, styles.medium, className)}>
                    { children }
                </h3>
            )}
            {size === 'large' && (
                <h2 className={_cs(styles.heading, styles.large, className)}>
                    { children }
                </h2>
            )}
            {size === 'extraLarge' && (
                <h1 className={_cs(styles.heading, styles.extraLarge, className)}>
                    { children }
                </h1>
            )}
        </>
    );
}

export default Heading;
