import React, { useMemo, useState, useCallback } from 'react';
import MdTooltip from '@material-ui/core/Tooltip';
import {
    _cs,
    listToMap,
    isDefined,
    compareString,
    compareNumber,
} from '@togglecorp/fujs';
import {
    IoMdDownload,
} from 'react-icons/io';
import {
    AiOutlineFileExcel,
    AiOutlineInfoCircle,
} from 'react-icons/ai';
import {
    Button,
    Table,
    Pager,
    SortContext,
    useSortState,
    useDownloading,
    convertTableData,
    PendingMessage,
} from '@togglecorp/toggle-ui';

import Map, {
    MapContainer,
    MapSource,
    MapLayer,
    MapTooltip,
} from '@togglecorp/re-map';

import { useRequest } from '#utils/request';
import {
    MultiResponse,
    add,
    removeZero,
} from '#utils/common';
import {
    createTextColumn,
    createNumberColumn,
} from '#components/tableHelpers';

import allAreas from '#resources/map.json';
import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';

const newDisplacementTooltip = 'New displacements corresponds to the estimated number of internal displacement movements to have taken place during the year. Figures include individuals who have been displaced more than once. In this sense, the number of new displacements does not equal to the number of people displaced during the year.';
const idpTooltip = 'Total number of IDPs corresponds to the total number of people living in internal displacement as of 31 December 2020.';
const mapDisclaimer = 'The boundaries and the names shown and the designations used on this map do not imply official endorsement or acceptance by IDMC.';

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
    id?: number;
    type: string;
    properties: Record<string, unknown>;
    geometry: unknown;
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

const layerPaint: mapboxgl.FillPaint = {
    'fill-color': '#e6e6e6',
    'fill-opacity': 0.3,
};
const layerPaintBlue: mapboxgl.FillPaint = {
    'fill-color': '#4c4c4c',
    'fill-opacity': 0.6,
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
        <div className={styles.mapTooltip}>
            <h3 className={styles.heading}>{info?.geo_name}</h3>
            <NumberBlock
                className={styles.block}
                label="Total number of IDPs"
                subLabel="as a result of conflict and violence as of the end of the year"
                value={info?.conflict_stock_displacement}
                size="xsmall"
                hideIfNoValue
                variant="conflict"
                abbreviate={false}
            />
            <NumberBlock
                className={styles.block}
                label="Conflict and violence new displacements"
                value={info?.conflict_new_displacements}
                size="xsmall"
                variant="conflict"
                hideIfNoValue
                abbreviate={false}
            />
            <NumberBlock
                className={styles.block}
                label="Total number of IDPs"
                subLabel="as a result of disasters as of the end of the year"
                value={info?.disaster_stock_displacement}
                size="xsmall"
                variant="disaster"
                hideIfNoValue
                abbreviate={false}
            />
            <NumberBlock
                className={styles.block}
                label="Disaster new displacements"
                value={info?.disaster_new_displacements}
                variant="disaster"
                size="xsmall"
                hideIfNoValue
                abbreviate={false}
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
        pending,
        response,
    } = useRequest<MultiResponse<DisplacementData>>({
        url: 'https://api.idmcdb.org/api/displacement_data',
        query: {
            // NOTE: To be changed to 2020 after data is available
            year: 2020,
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
            newConflictTotal: add(
                definedNewConflicts.map((c) => c.conflict_new_displacements),
            ) ?? 0,
            newConflictCountriesCount: definedNewConflicts.length,
            newDisasterTotal: add(
                definedNewDisasters.map((c) => c.disaster_new_displacements),
            ) ?? 0,
            newDisastersCountriesCount: definedNewDisasters.length,
            totalIdpConflictCount: add(
                definedStockConflict.map((c) => c.conflict_stock_displacement),
            ) ?? 0,
            idpConflictCountriesCount: definedStockConflict.length,
            totalIdpDisasterCount: add(
                definedStockDisasters.map((c) => c.disaster_stock_displacement),
            ) ?? 0,
            idpDisasterCountriesCount: definedStockDisasters.length,
        };
    }, [response?.results]);

    const newDisplacementTotal = newConflictTotal + newDisasterTotal;
    const totalIdpCount = totalIdpConflictCount + totalIdpDisasterCount;

    const {
        paginatedData,
        sortedData,
    } = useMemo(() => {
        if (!response?.results) {
            return {
                paginatedData: [],
                sortedData: [],
            };
        }
        const finalSortedData = [...response.results].map((d) => ({
            ...d,
            conflict_stock_displacement: removeZero(d.conflict_stock_displacement),
            conflict_new_displacements: removeZero(d.conflict_new_displacements),
            disaster_stock_displacement: removeZero(d.disaster_stock_displacement),
            disaster_new_displacements: removeZero(d.disaster_new_displacements),
        }));
        if (sorting) {
            finalSortedData.sort((a, b) => {
                if (sorting.name === 'geo_name') {
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
        const finalPaginatedData = [...finalSortedData];
        finalPaginatedData.splice(0, (activePage - 1) * pageSize);
        finalPaginatedData.length = pageSize;
        return {
            paginatedData: finalPaginatedData,
            sortedData: finalSortedData,
        };
    }, [sorting, activePage, pageSize, response?.results]);

    const columns = useMemo(
        () => ([
            createTextColumn<DisplacementData, string>(
                'geo_name',
                'Country / Territory',
                (item) => item.geo_name,
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'year',
                'Year',
                (item) => item.year,
                {
                    sortable: true,
                    separator: '',
                    columnClassName: styles.year,
                },
            ),
            createNumberColumn<DisplacementData, string>(
                'conflict_new_displacements',
                'Conflict New Displacement',
                (item) => item.conflict_new_displacements,
                {
                    sortable: true,
                    variant: 'conflict',
                },
            ),
            createNumberColumn<DisplacementData, string>(
                'conflict_stock_displacement',
                'Conflict Total number of IDPs',
                (item) => item.conflict_stock_displacement,
                {
                    sortable: true,
                    variant: 'conflict',
                },
            ),
            createNumberColumn<DisplacementData, string>(
                'disaster_new_displacements',
                'Disaster New Displacement',
                (item) => item.disaster_new_displacements,
                {
                    sortable: true,
                    variant: 'disaster',
                },
            ),
            createNumberColumn<DisplacementData, string>(
                'disaster_stock_displacement',
                'Disaster Total number of IDPs',
                (item) => item.disaster_stock_displacement,
                {
                    sortable: true,
                    variant: 'disaster',
                },
            ),
            createNumberColumn<DisplacementData, string>(
                'totalNew',
                'Total New Displacement',
                (item) => add([item.disaster_new_displacements, item.conflict_new_displacements]),
                { sortable: true },
            ),
            createNumberColumn<DisplacementData, string>(
                'totalStock',
                'Total number of IDPS',
                (item) => add([item.disaster_stock_displacement, item.conflict_stock_displacement]),
                { sortable: true },
            ),
        ]),
        [],
    );

    const columnsForDownload = useMemo(
        () => ([
            createTextColumn<DisplacementData, string>(
                'iso3',
                'ISO3',
                (item) => item.iso3,
                { sortable: true },
            ),
            ...columns,
        ]),
        [columns],
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

    const countriesWithData = useMemo(() => {
        if (!countriesMap) {
            return undefined;
        }
        const areas = (allAreas as GeoJson)
            .features.filter((a) => isDefined(countriesMap[a?.properties?.iso3]))
            .map((a, index) => ({
                ...a,
                id: index + 1,
            }));
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

    const getCsvValue = useCallback(
        () => convertTableData(
            sortedData,
            columnsForDownload,
        ),
        [sortedData, columnsForDownload],
    );

    const handleDownload = useDownloading(
        'IDMC_GIDD_internal_displacement_data_2020',
        getCsvValue,
    );

    return (
        <div className={_cs(className, styles.mapDashboard)}>
            {pending && <PendingMessage className={styles.pending} />}
            <header className={styles.header}>
                <h1 className={styles.heading}>2020 Internal Displacement</h1>
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
            </header>
            <div className={styles.topContent}>
                <div className={styles.leftContainer}>
                    <Map
                        mapStyle={lightStyle}
                        mapOptions={{
                            logoPosition: 'bottom-left',
                            zoom: 0.9,
                        }}
                        scaleControlShown
                        navControlShown
                    >
                        <MapContainer className={styles.mapContainer} />
                        <MapSource
                            sourceKey="all-areas"
                            sourceOptions={{
                                type: 'geojson',
                            }}
                            geoJson={allAreas}
                        >
                            <MapLayer
                                layerKey="all-areas-fill"
                                layerOptions={{
                                    type: 'fill',
                                    paint: layerPaint,
                                }}
                            />
                            <MapLayer
                                layerKey="all-areas"
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
                    <p className={styles.disclaimer}>
                        {mapDisclaimer}
                    </p>
                </div>
                <div className={styles.rightContainer}>
                    <div className={styles.infoBox}>
                        <header className={styles.header}>
                            <h2 className={styles.heading}>
                                New Displacements
                                <MdTooltip
                                    className={styles.tooltip}
                                    title={newDisplacementTooltip}
                                    placement="bottom"
                                >
                                    <p className={styles.tooltipContainer}>
                                        <AiOutlineInfoCircle className={styles.tooltip} />
                                    </p>
                                </MdTooltip>
                            </h2>
                            <span>in 2020</span>
                        </header>
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
                        <header className={styles.header}>
                            <h2 className={styles.heading}>
                                Total Number of IDPs
                                <MdTooltip
                                    className={styles.tooltip}
                                    title={idpTooltip}
                                    placement="bottom"
                                >
                                    <p className={styles.tooltipContainer}>
                                        <AiOutlineInfoCircle
                                            className={styles.tooltip}
                                        />
                                    </p>
                                </MdTooltip>
                            </h2>
                            <span>as of the end of 2020</span>
                        </header>
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
                </div>
            </div>
            <div className={styles.downloadBox}>
                <h3>
                    Download IDMC Dataset
                </h3>
                <a
                    href="https://api.idmcdb.org/api/displacement_data/xlsx?year=2008&year=2020&ci=IDMCWSHSOLO009&filename=IDMC_Internal_Displacement_Conflict-Violence_Disasters_2008_2020.xlsx"
                    className={styles.downloadLink}
                    download
                >
                    <AiOutlineFileExcel className={styles.icon} />
                    <div className={styles.text}>
                        Conflict/violence - disasters 2008-2020 per year
                    </div>
                </a>
                <a
                    href="https://api.idmcdb.org/api/disaster_data/xlsx?year=2008&year=2020&ci=IDMCWSHSOLO009&filename=IDMC_Internal_Displacement_Disasters_Events_2008_2020.xlsx"
                    className={styles.downloadLink}
                    download
                >
                    <AiOutlineFileExcel className={styles.icon} />
                    <div className={styles.text}>
                        Disaster events 2008-2020 (new displacement) per hazard type
                    </div>
                </a>
            </div>
            <div className={styles.bottomContent}>
                <div className={styles.pagerContainer}>
                    <Button
                        name="download"
                        onClick={handleDownload}
                        icons={(
                            <IoMdDownload />
                        )}
                        disabled={!columns || !paginatedData}
                        variant="primary"
                    >
                        Download
                    </Button>
                    <Pager
                        activePage={activePage}
                        itemsCount={response?.total ?? 0}
                        maxItemsPerPage={pageSize}
                        onActivePageChange={setActivePage}
                        onItemsPerPageChange={setPageSize}
                    />
                </div>
                <SortContext.Provider value={sortState}>
                    <Table
                        className={styles.table}
                        data={paginatedData}
                        keySelector={displacementItemKeySelector}
                        columns={columns}
                    />
                </SortContext.Provider>
            </div>
        </div>
    );
}

export default MapDashboard;
