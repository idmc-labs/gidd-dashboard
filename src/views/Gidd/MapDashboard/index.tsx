import React, { useCallback } from 'react';
import { _cs } from '@togglecorp/fujs';
import { AiOutlineFileExcel } from 'react-icons/ai';
import { Button } from '@togglecorp/toggle-ui';

import Map, {
    MapContainer,
    MapBounds,
} from '@togglecorp/re-map';

import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';

const lightStyle = 'mapbox://styles/mapbox/light-v10';

interface Props {
    className?: string;
    onSelectedPageChange: (pageType: PageType) => void;
}

function MapDashboard(props: Props) {
    const {
        className,
        onSelectedPageChange,
    } = props;

    const newDisplacementTotal = 14000000;
    const newConflictTotal = 14000000;
    const newConflictCountriesCount = 42;
    const newDisasterTotal = 300000000;
    const newDisastersCountriesCount = 144;

    const totalIdpCount = 55000000;
    const totalIdpConflictCount = 48000000;
    const idpConflictCountriesCount = 42;
    const totalIdpDisasterCount = 70000000;
    const idpDisasterCountriesCount = 104;

    const handleConflictClick = useCallback(() => {
        onSelectedPageChange('conflict');
    }, [onSelectedPageChange]);

    const handleDisasterClick = useCallback(() => {
        onSelectedPageChange('disaster');
    }, [onSelectedPageChange]);

    return (
        <div className={_cs(className, styles.mapDashboard)}>
            <header className={styles.header}>
                <h1 className={styles.heading}>2020 Internal Displacement</h1>
            </header>
            <div className={styles.content}>
                <div className={styles.leftContainer}>
                    <Map
                        mapStyle={lightStyle}
                        mapOptions={{
                            logoPosition: 'bottom-left',
                        }}
                        scaleControlShown
                        navControlShown
                    >
                        <MapContainer className={styles.mapContainer} />
                        <MapBounds
                            bounds={undefined}
                        />
                    </Map>
                </div>
                <div className={styles.rightContainer}>
                    <div className={styles.infoBox}>
                        <h2>
                            New Displacement 2020
                        </h2>
                        <NumberBlock
                            label="Total"
                            value={newDisplacementTotal}
                            variant="normal"
                            size="large"
                        />
                        <div className={styles.inlineBlock}>
                            <NumberBlock
                                label="Conflict and violence"
                                subLabel={`In ${newConflictCountriesCount} countries and territories`}
                                value={newConflictTotal}
                                variant="conflict"
                                size="medium"
                            />
                            <NumberBlock
                                label="Disasters"
                                subLabel={`In ${newDisastersCountriesCount} countries and territories`}
                                value={newDisasterTotal}
                                variant="disaster"
                                size="medium"
                            />
                        </div>
                    </div>
                    <div className={styles.infoBox}>
                        <h2>
                            Total Number of IDPs
                        </h2>
                        <NumberBlock
                            label="Total"
                            value={totalIdpCount}
                            variant="normal"
                            size="large"
                        />
                        <div className={styles.inlineBlock}>
                            <NumberBlock
                                label="Conflict and violence"
                                subLabel={`In ${idpConflictCountriesCount} countries and territories`}
                                value={totalIdpConflictCount}
                                variant="conflict"
                                size="medium"
                            />
                            <NumberBlock
                                label="Disasters"
                                subLabel={`In ${idpDisasterCountriesCount} countries and territories`}
                                value={totalIdpDisasterCount}
                                variant="disaster"
                                size="medium"
                            />
                        </div>
                    </div>
                    <div className={styles.downloadBox}>
                        <h3>
                            Download IDMC Dataset
                        </h3>
                        <a
                            href="https://i.imgur.com/NUyttbn.mp4"
                            className={styles.downloadLink}
                            download
                        >
                            <AiOutlineFileExcel className={styles.icon} />
                            Conflict/violence - disasters 2008-2009 per year
                        </a>
                        <a
                            href="https://i.imgur.com/NUyttbn.mp4"
                            className={styles.downloadLink}
                            download
                        >
                            <AiOutlineFileExcel className={styles.icon} />
                            Disaster events 2008-2020 (new displacement) per hazard type
                        </a>
                    </div>
                </div>
            </div>
            <div className={styles.footer}>
                <h1>IDMC Query Tool</h1>
                <div className={styles.buttonContainer}>
                    <Button
                        name="conflict"
                        onClick={handleConflictClick}
                        className={_cs(styles.button, styles.conflictButton)}
                    >
                        Conflict and violence Data
                    </Button>
                    <Button
                        name="diasater"
                        onClick={handleDisasterClick}
                        className={_cs(styles.button, styles.disasterButton)}
                    >
                        Disaster Data
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default MapDashboard;
