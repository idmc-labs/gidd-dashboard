import React from 'react';
import { isFalsyString, _cs } from '@togglecorp/fujs';

import styles from './styles.css';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export interface ExternalLinkProps {
    title?: React.ReactNode | null;
    link?: string | null;
    className?: string;
}
function ExternalLinkCell(props: ExternalLinkProps) {
    const {
        title,
        link,
        className,
    } = props;

    if (!title) {
        return null;
    }

    if (isFalsyString(link)) {
        return (
            <div className={_cs(styles.externalLink, className)}>
                {title}
            </div>
        );
    }

    return (
        <a
            className={_cs(styles.externalLink, className)}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title={isString(title) ? title : undefined}
        >
            {title}
        </a>
    );
}
export default ExternalLinkCell;
