import React, { useMemo, useState, useCallback } from 'react';
import {
    _cs,
    sum,
    isDefined,
    compareString,
    compareNumber,
} from '@togglecorp/fujs';
import { AiOutlineFileExcel } from 'react-icons/ai';
import {
    Button,
    createNumberColumn,
    Table,
    Pager,
    SortContext,
    useSortState,
} from '@togglecorp/toggle-ui';

import Map, {
    MapContainer,
    MapBounds,
} from '@togglecorp/re-map';

import { useRequest } from '#utils/request';
import { MultiResponse } from '#utils/common';
import { createTextColumn } from '#components/tableHelpers';

import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';

function add(...args: (number | undefined)[]) {
    const newArgs = args.filter((arg) => isDefined(arg));
    return sum(newArgs);
}

const lightStyle = 'mapbox://styles/mapbox/light-v10';

interface DisplacementData {
    iso3: string;
    // eslint-disable-next-line camelcase
    geo_name: string;
    year: number;
    // eslint-disable-next-line camelcase
    conflict_stock_displacement?: number;
    // eslint-disable-next-line camelcase
    conflict_new_displacements?: number;
    // eslint-disable-next-line camelcase
    disaster_stock_displacement?: number;
    // eslint-disable-next-line camelcase
    disaster_new_displacements?: number;
}

const displacementItemKeySelector = (d: DisplacementData) => d.iso3;

interface Props {
    className?: string;
    onSelectedPageChange: (pageType: PageType) => void;
}

function MapDashboard(props: Props) {
    const {
        className,
        onSelectedPageChange,
    } = props;

    const sortState = useSortState();
    const { sorting } = sortState;
    const [activePage, setActivePage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    const {
        response,
    } = useRequest<MultiResponse<DisplacementData>>({
        url: 'https://api.idmcdb.org/api/displacement_data',
        query: {
            // NOTE: To be changed to 2020 after data is available
            year: 2019,
            ci: 'IDMCWSHSOLO009',
        },
        method: 'GET',
    });

    const {
        newConflictCountriesCount,
        newConflictTotal,
        newDisasterTotal,
        newDisastersCountriesCount,
        totalIdpConflictCount,
        totalIdpDisasterCount,
        idpConflictCountriesCount,
        idpDisasterCountriesCount,
    } = useMemo(() => {
        if (!response?.results) {
            return {
                newConflictTotal: 0,
                newConflictCountriesCount: 0,
                newDisasterTotal: 0,
                newDisastersCountriesCount: 0,
                totalIdpConflictCount: 0,
                idpConflictCountriesCount: 0,
                totalIdpDisasterCount: 0,
                idpDisasterCountriesCount: 0,
            };
        }
        const definedNewConflicts = response.results
            .filter((r) => isDefined(r.conflict_new_displacements));
        const definedNewDisasters = response.results
            .filter((r) => isDefined(r.disaster_new_displacements));
        const definedStockConflict = response.results
            .filter((r) => isDefined(r.conflict_stock_displacement));
        const definedStockDisasters = response.results
            .filter((r) => isDefined(r.disaster_stock_displacement));

        return {
            newConflictTotal: sum(definedNewConflicts.map((c) => c.conflict_new_displacements)),
            newConflictCountriesCount: definedNewConflicts.length,
            newDisasterTotal: sum(definedNewDisasters.map((c) => c.disaster_new_displacements)),
            newDisastersCountriesCount: definedNewDisasters.length,
            totalIdpConflictCount: sum(
                definedStockConflict.map((c) => c.conflict_stock_displacement),
            ),
            idpConflictCountriesCount: definedStockConflict.length,
            totalIdpDisasterCount: sum(
                definedStockDisasters.map((c) => c.disaster_stock_displacement),
            ),
            idpDisasterCountriesCount: definedStockDisasters.length,
        };
    }, [response?.results]);

    const newDisplacementTotal = newConflictTotal + newDisasterTotal;
    const totalIdpCount = totalIdpConflictCount + totalIdpDisasterCount;

    const paginatedData = useMemo(() => {
        if (!response?.results) {
            return [];
        }
        const finalPaginatedData = [...response?.results];
        if (sorting) {
            finalPaginatedData.sort((a, b) => {
                if (sorting.name === 'iso3' || sorting.name === 'geo_name') {
                    return compareString(
                        a[sorting.name],
                        b[sorting.name],
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                if (
                    sorting.name === 'conflict_stock_displacement'
                    || sorting.name === 'conflict_new_displacements'
                    || sorting.name === 'disaster_stock_displacement'
                    || sorting.name === 'disaster_new_displacements'
                    || sorting.name === 'year'
                ) {
                    return compareNumber(
                        a[sorting.name],
                        b[sorting.name],
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                if (sorting.name === 'totalStock') {
                    return compareNumber(
                        add(a.disaster_stock_displacement, a.conflict_stock_displacement),
                        add(b.disaster_stock_displacement, b.conflict_stock_displacement),
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                if (sorting.name === 'totalNew') {
                    return compareNumber(
                        add(a.disaster_new_displacements, a.conflict_new_displacements),
                        add(b.disaster_new_displacements, b.conflict_new_displacements),
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                return 1;
            });
        }
        finalPaginatedData.splice(0, (activePage - 1) * pageSize);
        finalPaginatedData.length = pageSize;
        return finalPaginatedData;
    }, [sorting, activePage, pageSize, response?.results]);

    const columns = useMemo(
        () => ([
            createTextColumn<DisplacementData, string>(
                'iso3',
                'ISO3',
                (item) => item.iso3,
                { sortable: true },
            ),
            createTextColumn<DisplacementData, string>(
                'geo_name',
                'Name',
                (item) => item.geo_name,
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'year',
                'Year',
                (item) => Number(item.year),
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'conflict_stock_displacement',
                'Conflict Stock Displacement',
                (item) => item.conflict_stock_displacement,
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'conflict_new_displacements',
                'Conflict New Displacement',
                (item) => item.conflict_new_displacements,
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'disaster_stock_displacement',
                'Disaster Stock Displacement',
                (item) => item.disaster_stock_displacement,
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'disaster_new_displacements',
                'Disaster New Displacement',
                (item) => item.disaster_new_displacements,
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'totalStock',
                'Total Stock Displacement',
                (item) => add(item.disaster_stock_displacement, item.conflict_stock_displacement),
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'totalNew',
                'Total New Displacement',
                (item) => add(item.disaster_new_displacements, item.conflict_new_displacements),
                { sortable: true },
            ),
        ]),
        [],
    );

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
            <div className={styles.topContent}>
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
            <div className={styles.bottomContent}>
                <SortContext.Provider value={sortState}>
                    <Table
                        className={styles.table}
                        data={paginatedData}
                        keySelector={displacementItemKeySelector}
                        columns={columns}
                    />
                </SortContext.Provider>
                <Pager
                    activePage={activePage}
                    itemsCount={response?.total ?? 0}
                    maxItemsPerPage={pageSize}
                    onActivePageChange={setActivePage}
                    onItemsPerPageChange={setPageSize}
                />
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
