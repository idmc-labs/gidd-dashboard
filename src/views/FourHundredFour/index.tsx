import React from 'react';
import { _cs } from '@togglecorp/fujs';

import styles from './styles.css';

interface FourHundredFourProps {
    className?: string;
}
const FourHundredFour = ({ className }: FourHundredFourProps) => (
    <div className={_cs(className, styles.fourHundredFour)}>
        <h1 className={styles.heading}>
            404
        </h1>
        <p className={styles.message}>
            The page you are looking for does not exist!
        </p>
    </div>
);

export default FourHundredFour;
