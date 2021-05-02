import React, { useState } from 'react';
import { _cs } from '@togglecorp/fujs';

import MapDashboard from './MapDashboard';
import Conflict from './Conflict';
import Disaster from './Disaster';

import styles from './styles.css';

interface Props {
    className?: string;
}

export type PageType = 'map' | 'conflict' | 'disaster';

function Gidd(props: Props) {
    const { className } = props;
    const [selectedPage, setSelectedPage] = useState<PageType>('conflict');

    return (
        <div className={_cs(className, styles.gidd)}>
            {selectedPage === 'map' && (
                <MapDashboard
                    onSelectedPageChange={setSelectedPage}
                />
            )}
            {selectedPage === 'conflict' && (
                <Conflict
                    onSelectedPageChange={setSelectedPage}
                />
            )}
            {selectedPage === 'disaster' && (
                <Disaster
                    onSelectedPageChange={setSelectedPage}
                />
            )}
        </div>
    );
}

export default Gidd;
