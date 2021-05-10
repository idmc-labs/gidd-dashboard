import React, { useMemo, useState, useCallback } from 'react';
import {
    _cs,
    listToMap,
    isDefined,
    compareString,
    compareNumber,
} from '@togglecorp/fujs';
import { AiOutlineFileExcel } from 'react-icons/ai';
import bbox from '@turf/bbox';
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
    MapSource,
    MapLayer,
    MapTooltip,
} from '@togglecorp/re-map';

import { useRequest } from '#utils/request';
import {
    MultiResponse,
    add,
} from '#utils/common';
import { createTextColumn } from '#components/tableHelpers';

import allAreas from '#resources/map.json';
import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';

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

interface GeoJsonFeature {
    type: string;
    properties: Record<string, unknown>;
    geometry: unknown;
    id: number;
}

// We should use one from mapbox
interface GeoJson {
    type: string;
    crs?: unknown;
    features: GeoJsonFeature[];
}

interface HoveredRegion {
    feature: mapboxgl.MapboxGeoJSONFeature;
    lngLat: mapboxgl.LngLatLike;
    info?: DisplacementData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};
const layerPaint: mapboxgl.FillPaint = {
    'fill-color': '#fff',
    'fill-opacity': 1,
};
const layerPaintBlue: mapboxgl.FillPaint = {
    'fill-color': [
        'case',
        ['==', ['feature-state', 'hovered'], 1],
        '#37558f',
        '#4472c4',
    ],
    'fill-opacity': 1,
};
const outlinePaintLight: mapboxgl.LinePaint = {
    'line-color': '#f0f0f0',
    'line-width': 1,
    'line-opacity': 1,
};
const outlinePaintDark: mapboxgl.LinePaint = {
    'line-color': '#414141',
    'line-width': 1,
    'line-opacity': 1,
};
const tooltipOptions: mapboxgl.PopupOptions = {
    closeOnClick: false,
    closeButton: false,
    offset: 8,
    maxWidth: '480px',
};

interface TooltipProps {
    feature?: mapboxgl.MapboxGeoJSONFeature;
    info?: DisplacementData;
}
function Tooltip({
    feature,
    info,
}: TooltipProps) {
    if (!feature) {
        return null;
    }

    return (
        <div>
            <h3>{info?.geo_name}</h3>
            <NumberBlock
                label="Conflict IDP"
                value={info?.conflict_stock_displacement}
                size="small"
                hideIfNoValue
            />
            <NumberBlock
                label="Conflict New Displacements"
                value={info?.conflict_new_displacements}
                size="small"
                hideIfNoValue
            />
            <NumberBlock
                label="Disaster IDP"
                value={info?.disaster_stock_displacement}
                size="small"
                hideIfNoValue
            />
            <NumberBlock
                label="Disaster New Displacements"
                value={info?.disaster_new_displacements}
                size="small"
                hideIfNoValue
            />
        </div>
    );
}

const lightStyle = 'mapbox://styles/mapbox/light-v10';

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
            newConflictTotal: add(definedNewConflicts.map((c) => c.conflict_new_displacements)),
            newConflictCountriesCount: definedNewConflicts.length,
            newDisasterTotal: add(definedNewDisasters.map((c) => c.disaster_new_displacements)),
            newDisastersCountriesCount: definedNewDisasters.length,
            totalIdpConflictCount: add(
                definedStockConflict.map((c) => c.conflict_stock_displacement),
            ),
            idpConflictCountriesCount: definedStockConflict.length,
            totalIdpDisasterCount: add(
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
                        add([a.disaster_stock_displacement, a.conflict_stock_displacement]),
                        add([b.disaster_stock_displacement, b.conflict_stock_displacement]),
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                if (sorting.name === 'totalNew') {
                    return compareNumber(
                        add([a.disaster_new_displacements, a.conflict_new_displacements]),
                        add([b.disaster_new_displacements, b.conflict_new_displacements]),
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
                (item) => add([item.disaster_stock_displacement, item.conflict_stock_displacement]),
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'totalNew',
                'Total New Displacement',
                (item) => add([item.disaster_new_displacements, item.conflict_new_displacements]),
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

    const countriesMap = useMemo(() => {
        if (!response?.results) {
            return undefined;
        }
        return listToMap(response.results, (d) => d.iso3, (d) => d);
    }, [response?.results]);

    const bounds = useMemo(() => bbox(allAreas), []);
    const countriesWithData = useMemo(() => {
        if (!countriesMap) {
            return undefined;
        }
        const areas = (allAreas as GeoJson)
            .features.filter((a) => isDefined(countriesMap[a?.properties?.iso3]));
        return {
            ...allAreas,
            features: areas,
        };
    }, [countriesMap]);

    const [
        hoveredRegionProperties,
        setHoveredRegionProperties,
    ] = React.useState<HoveredRegion | undefined>();

    const handleMapRegionMouseEnter = React.useCallback(
        (feature: mapboxgl.MapboxGeoJSONFeature, lngLat: mapboxgl.LngLat) => {
            setHoveredRegionProperties({
                feature,
                lngLat,
                info: countriesMap?.[feature?.properties?.iso3],
            });
        },
        [setHoveredRegionProperties, countriesMap],
    );

    const handleMapRegionMouseLeave = React.useCallback(
        () => {
            setHoveredRegionProperties(undefined);
        },
        [setHoveredRegionProperties],
    );

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
                        <MapBounds bounds={bounds} />
                        <MapSource
                            sourceKey="all-areas"
                            sourceOptions={{
                                type: 'geojson',
                            }}
                            geoJson={allAreas}
                        >
                            <MapLayer
                                layerKey="all-areas-fill"
                                onMouseEnter={noOp}
                                layerOptions={{
                                    type: 'fill',
                                    paint: layerPaint,
                                }}
                            />
                            <MapLayer
                                layerKey="all-areas"
                                onMouseEnter={noOp}
                                layerOptions={{
                                    type: 'line',
                                    paint: outlinePaintDark,
                                }}
                            />
                        </MapSource>
                        {countriesWithData && (
                            <MapSource
                                sourceKey="all-areas-selected"
                                sourceOptions={{
                                    type: 'geojson',
                                }}
                                geoJson={countriesWithData}
                            >
                                <MapLayer
                                    layerKey="all-areas-selected-fill"
                                    onMouseEnter={handleMapRegionMouseEnter}
                                    onMouseLeave={handleMapRegionMouseLeave}
                                    layerOptions={{
                                        type: 'fill',
                                        paint: layerPaintBlue,
                                    }}
                                />
                                <MapLayer
                                    layerKey="all-areas-selected"
                                    onMouseEnter={noOp}
                                    layerOptions={{
                                        type: 'line',
                                        paint: outlinePaintLight,
                                    }}
                                />
                            </MapSource>
                        )}
                        { hoveredRegionProperties && hoveredRegionProperties.lngLat && (
                            <MapTooltip
                                coordinates={hoveredRegionProperties.lngLat}
                                tooltipOptions={tooltipOptions}
                                trackPointer
                            >
                                <Tooltip
                                    feature={hoveredRegionProperties.feature}
                                    info={hoveredRegionProperties.info}
                                />
                            </MapTooltip>
                        )}
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
