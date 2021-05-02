import React from 'react';
import { _cs } from '@togglecorp/fujs';

import styles from './styles.css';

interface ErrorProps {
    className?: string;
}
const Error = ({ className }: ErrorProps) => (
    <div className={_cs(className, styles.error)}>
        <h1 className={styles.heading}>
            Oops!
        </h1>
        <p className={styles.message}>
            Some error has occurred!
        </p>
    </div>
);

export default Error;
