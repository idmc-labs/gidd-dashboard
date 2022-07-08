import React, { useMemo, useState, useCallback } from 'react';
import {
    _cs,
    sum,
    randomString,
    isDefined,
    unique,
    compareString,
    compareNumber,
    listToGroupList,
    mapToList,
    mapToMap,
    isNotDefined,
} from '@togglecorp/fujs';
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from 'recharts';
import {
    MultiSelectInput,
    Button,
    Table,
    Pager,
    createDateColumn,
    SortContext,
    useSortState,
    convertTableData,
    PendingMessage,
} from '@togglecorp/toggle-ui';
import { IoMdDownload } from 'react-icons/io';
import useDebouncedValue from '#hooks/useDebouncedValue';

import {
    createTextColumn,
    createNumberColumn,
} from '#components/tableHelpers';
import { useRequest } from '#utils/request';
import {
    MultiResponse,
    formatNumber,
    regions,
    useDownloading,
    regionMap,
    calcPieSizes,
    roundAndRemoveZero,
} from '#utils/common';
import { currentYear } from '#config/env';
import SliderInput from '#components/SliderInput';
import Header from '#components/Header';
import useInputState from '#hooks/useInputState';

import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';

// NOTE: we only need 3 colors
const disasterColorSchemes = [
    // 'rgb(6, 23, 158)',
    // 'rgb(8, 56, 201)',
    // 'rgb(8, 116, 226)',
    'rgb(1, 142, 202)',
    'rgb(45, 183, 226)',
    'rgb(94, 217, 238)',
];

const colorScheme = [
    'rgb(6, 23, 158)',
    'rgb(8, 56, 201)',
    'rgb(8, 116, 226)',
    'rgb(1, 142, 202)',
    'rgb(45, 183, 226)',
    'rgb(94, 217, 238)',
];

interface DisasterData {
    key: string;
    iso3: string;
    // eslint-disable-next-line camelcase
    geo_name: string;
    year: string;
    // eslint-disable-next-line camelcase
    new_displacements?: number;
    // eslint-disable-next-line camelcase
    event_name?: string;
    // eslint-disable-next-line camelcase
    glide_number?: string;
    // eslint-disable-next-line camelcase
    start_date: string;
    // eslint-disable-next-line camelcase
    hazard_category: string;
    // eslint-disable-next-line camelcase
    hazard_sub_category: string;
    // eslint-disable-next-line camelcase
    hazard_type: string;
    // eslint-disable-next-line camelcase
    hazard_sub_type: string;
}

function subTypeTransformer(subType = '') {
    if (subType.toLowerCase() === 'wet mass movement') {
        return 'Wet Mass Movement';
    }
    if (subType === 'Volcanic eruption' || subType === 'Volcanic activity') {
        return 'Volcanic eruption';
    }
    return subType;
}

function filterDisasterData(
    data: DisasterData[],
    regionsFilter: string[],
    countries: string[],
    years: number[],
    disasterType: string[],
) {
    const regionCountries = regionsFilter.map((r) => regionMap[r]).flat();
    return data.filter((d) => (
        (
            Number(d.year) >= years[0]
            && Number(d.year) <= years[1]
        ) && (
            countries.length === 0
            || countries.indexOf(d.iso3) !== -1
        ) && (
            disasterType.length === 0
            || disasterType.indexOf(subTypeTransformer(d.hazard_type)) !== -1
        ) && (
            regionsFilter.length === 0
            || regionCountries.indexOf(d.iso3) !== -1
        )
    ));
}

function aggregateByYear(
    // eslint-disable-next-line camelcase
    lst: { year: number, iso3: string, value: number, hazard_type: string }[],
) {
    return mapToList(
        listToGroupList(
            lst,
            (item) => item.year,
        ),
        (items, key): { year: number, total: number, [key: string]: number | undefined} => ({
            year: Number(key),
            total: sum(items.map((item) => item.value)),
            ...mapToMap(
                listToGroupList(
                    items,
                    (item) => item.iso3,
                ),
                (k) => k,
                (itms) => sum(itms.map((itm) => itm.value)),
            ),
        }),
    );
}
function aggregateByHazardType(
    // eslint-disable-next-line camelcase
    lst: { year: number, iso3: string, value: number, hazard_type: string }[],
) {
    return mapToList(
        listToGroupList(
            lst,
            (item) => item.hazard_type,
        ),
        (items, key): { label: string, total: number } => ({
            label: String(key),
            total: sum(items.map((item) => item.value)),
        }),
    );
}

function processDisasterData(data: DisasterData[]) {
    const newDisplacements = data.map((item) => {
        if (isNotDefined(item.new_displacements)) {
            return undefined;
        }
        return {
            year: Number(item.year),
            iso3: item.iso3,
            value: item.new_displacements,
            hazard_type: item.hazard_type,
        };
    }).filter(isDefined);

    const totalNewDisplacements = sum(
        newDisplacements
            .map((d) => d.value)
            .filter(isDefined),
    );

    const newDisplacementsByYear = aggregateByYear(newDisplacements);
    const newDisplacementsByHazardType = aggregateByHazardType(newDisplacements);

    return {
        totalNewDisplacements,
        newDisplacementsByYear,
        newDisplacementsByHazardType,
    };
}

const disasterItemKeySelector = (d: DisasterData) => d.key;
interface Item {
    key: string;
    value: string;
    countries?: string[];
}

interface ItemWithGroup {
    key: string;
    value: string;
    parent: string;
}

const inputKeySelector = (d: Item) => d.key;
const inputValueSelector = (d: Item) => d.value;

const groupedItemKeySelector = (item: ItemWithGroup) => item.key;
const groupedItemLabelSelector = (item: ItemWithGroup) => item.value;

const groupKeySelector = (item: ItemWithGroup) => item.parent;
const groupLabelSelector = (item: ItemWithGroup) => item.parent;

const chartMargins = { top: 16, left: 16, right: 16, bottom: 5 };

interface Props {
    className?: string;
    onSelectedPageChange: (pageType: PageType) => void;
}

function Disaster(props: Props) {
    const {
        className,
        onSelectedPageChange,
    } = props;

    const [activePage, setActivePage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    const [regionsValue, setRegionsValue] = useInputState<string[]>([]);
    const [countriesValue, setCountriesValue] = useInputState<string[]>([]);
    const [disasterTypeValue, setDisasterTypeValue] = useInputState<string[]>([]);
    const [years, setYears] = useState<number[]>([2008, currentYear]);

    const value = useMemo(() => ({
        regions: regionsValue,
        countries: countriesValue,
        disasterType: disasterTypeValue,
        years,
    }), [regionsValue, countriesValue, disasterTypeValue, years]);

    const sortState = useSortState();
    const { sorting } = sortState;

    const finalFormValue = useDebouncedValue(value);

    const handleBackButton = useCallback(() => {
        onSelectedPageChange('map');
    }, [onSelectedPageChange]);

    const {
        pending,
        response,
    } = useRequest<MultiResponse<DisasterData>>({
        url: `https://api.idmcdb.org/api/disaster_data?ci=IDMCWSHSOLO009&year=2008&year=${currentYear}&range=true`,
        /*
        query: {
            ci: 'IDMCWSHSOLO009',
        },
        */
        method: 'GET',
    });

    const {
        countriesList,
        subTypeList,
    } = useMemo(() => {
        if (!response?.results) {
            return {
                countriesList: [],
                subTypeList: [],
            };
        }
        const countries = unique(
            response.results.filter((d) => isDefined(d.geo_name),
                (d: DisasterData) => d.iso3),
        ).map((d) => ({
            key: d.iso3,
            value: d.geo_name,
        })).sort((a, b) => compareString(a.value, b.value));

        // NOTE: I've grouped sub types based on hazard category
        const subTypes = unique(
            response.results.filter((d) => isDefined(d.hazard_type),
                (d: DisasterData) => d.hazard_type),
        ).map((d) => ({
            key: subTypeTransformer(d.hazard_type),
            value: d.hazard_type,
            parent: d.hazard_category,
        }));
        return {
            countriesList: countries,
            subTypeList: subTypes,
        };
    }, [response?.results]);

    const multilines = finalFormValue.countries.length > 0
        && finalFormValue.countries.length <= 3;

    const disasterResults = useMemo(() => (
        response?.results.filter(
            // NOTE: we filter out data with empty or zero new_displacements
            (item) => isDefined(item.new_displacements) && item.new_displacements !== 0,
        ).map((item) => ({
            ...item,
            // NOTE: we add a key because we do not have a key for disaster data
            key: randomString(),
            hazard_type: subTypeTransformer(item.hazard_type),
        }))
    ), [response?.results]);

    const filteredData = useMemo(
        () => filterDisasterData(
            disasterResults ?? [],
            finalFormValue.regions,
            finalFormValue.countries,
            finalFormValue.years,
            finalFormValue.disasterType,
        ),
        [disasterResults, finalFormValue],
    );

    const totalCount = filteredData?.length ?? 0;

    const noOfCountries = useMemo(
        () => unique(
            filteredData ?? [],
            (d) => d.iso3,
        ).length,
        [filteredData],
    );

    const {
        totalNewDisplacements: noTotal,
        newDisplacementsByYear: filteredAggregatedData,
        newDisplacementsByHazardType,
    } = useMemo(
        () => processDisasterData(filteredData),
        [filteredData],
    );

    const filteredPieData = useMemo(
        () => calcPieSizes(newDisplacementsByHazardType),
        [newDisplacementsByHazardType],
    );

    const paginatedData = useMemo(() => {
        const finalPaginatedData = [...filteredData];
        if (sorting) {
            finalPaginatedData.sort((a, b) => {
                if (
                    sorting.name === 'geo_name'
                    || sorting.name === 'event_name'
                    || sorting.name === 'start_date'
                    || sorting.name === 'hazard_category'
                    || sorting.name === 'hazard_sub_category'
                    || sorting.name === 'hazard_type'
                    || sorting.name === 'hazard_sub_type'
                ) {
                    return compareString(
                        a[sorting.name],
                        b[sorting.name],
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                if (
                    sorting.name === 'new_displacements'
                    || sorting.name === 'year'
                ) {
                    return compareNumber(
                        Number(a[sorting.name]),
                        Number(b[sorting.name]),
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                return 1;
            });
        }
        finalPaginatedData.splice(0, (activePage - 1) * pageSize);
        finalPaginatedData.length = pageSize;
        return finalPaginatedData;
    }, [sorting, activePage, pageSize, filteredData]);

    const columns = useMemo(
        () => ([
            createTextColumn<DisasterData, string>(
                'geo_name',
                'Country / Territory',
                (item) => item.geo_name ?? countriesList.find((c) => c.key === item.iso3)?.value,
                { sortable: true },
            ),
            createNumberColumn<DisasterData, string>(
                'year',
                'Year',
                (item) => Number(item.year),
                {
                    sortable: true,
                    separator: '',
                    columnClassName: styles.year,
                },
            ),
            createTextColumn<DisasterData, string>(
                'event_name',
                'Event Name',
                (item) => item.event_name ?? item.glide_number,
                {
                    sortable: true,
                    columnClassName: styles.event,
                },
            ),
            createDateColumn<DisasterData, string>(
                'start_date',
                'Date of event (start)',
                (item) => item.start_date,
                {
                    sortable: true,
                    columnClassName: styles.date,
                },
            ),
            createNumberColumn<DisasterData, string>(
                'new_displacements',
                'Disaster Internal Displacements',
                (item) => roundAndRemoveZero(item.new_displacements),
                { sortable: true },
            ),
            createTextColumn<DisasterData, string>(
                'hazard_category',
                'Hazard Category',
                (item) => item.hazard_category,
                { sortable: true },
            ),
            createTextColumn<DisasterData, string>(
                'hazard_type',
                'Hazard Type',
                (item) => item.hazard_type,
                { sortable: true },
            ),
        ]),
        [countriesList],
    );

    const columnsForDownload = useMemo(
        () => ([
            createTextColumn<DisasterData, string>(
                'iso3',
                'ISO3',
                (item) => item.iso3,
                { sortable: true },
            ),
            ...columns,
            createTextColumn<DisasterData, string>(
                'hazard_sub_type',
                'Hazard Sub Type',
                (item) => item.hazard_sub_type,
            ),
        ]),
        [columns],
    );

    const getDownloadValue = useCallback(
        () => convertTableData(
            filteredData,
            columnsForDownload,
        ),
        [filteredData, columnsForDownload],
    );

    const handleDownload = useDownloading(
        `IDMC_GIDD_disasters_internal_displacement_data_${currentYear}`,
        getDownloadValue,
    );

    const handleDownloadClick = useCallback(() => {
        handleDownload();
        const url = 'https://gidd.idmcdb.org/assets/ReadMeFile_GIDD.docx';
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ReadMeFile_GIDD.docx';
        a.click();
    }, [handleDownload]);

    return (
        <div className={_cs(className, styles.disaster)}>
            <header className={styles.header}>
                <h1 className={styles.heading}>IDMC Query Tool - Disaster</h1>
                <Button
                    className={styles.button}
                    name="back"
                    variant="primary"
                    onClick={handleBackButton}
                >
                    Go back
                </Button>
            </header>
            <div className={styles.content}>
                {pending && <PendingMessage className={styles.pending} />}
                <div className={styles.filters}>
                    <Header
                        heading="Regions"
                        headingSize="extraSmall"
                        description={(
                            <MultiSelectInput
                                name="regions"
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                options={regions}
                                keySelector={inputKeySelector}
                                labelSelector={inputValueSelector}
                                value={regionsValue}
                                onChange={setRegionsValue}
                                optionsPopupClassName={styles.popup}
                            />
                        )}
                    />
                    <Header
                        heading="Countries and territories"
                        headingSize="extraSmall"
                        description={(
                            <MultiSelectInput
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                keySelector={inputKeySelector}
                                labelSelector={inputValueSelector}
                                name="countries"
                                onChange={setCountriesValue}
                                options={countriesList}
                                optionsPopupClassName={styles.popup}
                                value={countriesValue}
                            />
                        )}
                    />
                    <Header
                        heading="Hazard Category"
                        headingSize="extraSmall"
                        description={(
                            <MultiSelectInput
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                keySelector={groupedItemKeySelector}
                                labelSelector={groupedItemLabelSelector}
                                name="disasterType"
                                onChange={setDisasterTypeValue}
                                options={subTypeList}
                                optionsPopupClassName={styles.popup}
                                value={disasterTypeValue}
                                groupKeySelector={groupKeySelector}
                                groupLabelSelector={groupLabelSelector}
                                grouped
                            />
                        )}
                    />
                    <SliderInput
                        className={styles.slider}
                        min={2008}
                        max={currentYear}
                        step={1}
                        minDistance={0}
                        onChange={setYears}
                        labelDescription={`${years[0]}-${years[1]}`}
                        value={years}
                        hideValues
                    />
                </div>
                <div className={styles.informationBar}>
                    <h2 className={styles.infoHeading}>
                        {`Internal Displacements from
                            ${finalFormValue.years[0]} to ${finalFormValue.years[1]}
                        `}
                    </h2>
                    <div className={styles.numbersContainer}>
                        <div className={styles.leftContainer}>
                            <NumberBlock
                                label="Countries and territories"
                                className={styles.numberBlock}
                                value={noOfCountries}
                                variant="normal"
                                size="large"
                            />
                            <div className={styles.leftBottomContainer}>
                                <NumberBlock
                                    className={styles.numberBlock}
                                    label="Internal displacements"
                                    secondarySubLabel="Disasters"
                                    subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                                    value={noTotal}
                                    variant="disaster"
                                    size="medium"
                                />
                                <NumberBlock
                                    className={styles.numberBlock}
                                    label="Disaster events reported"
                                    subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                                    value={filteredData?.length}
                                    variant="disaster"
                                    size="medium"
                                />
                            </div>
                        </div>
                        <div className={styles.chartsContainer}>
                            <LineChart
                                width={320}
                                height={200}
                                data={filteredAggregatedData}
                                className={styles.chart}
                                margin={chartMargins}
                            >
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    allowDecimals={false}
                                    type="number"
                                    domain={value.years}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickFormatter={formatNumber}
                                />
                                <Tooltip
                                    formatter={formatNumber}
                                />
                                <Legend />
                                {multilines ? (
                                    finalFormValue.countries.map((item, i) => (
                                        <Line
                                            key={item}
                                            dataKey={item}
                                            name={
                                                finalFormValue.countries.length > 1
                                                    ? countriesList.find(
                                                        (c) => c.key === item)?.value || item
                                                    : 'Disaster internal displacements'
                                            }
                                            strokeWidth={2}
                                            connectNulls
                                            dot
                                            stroke={disasterColorSchemes[
                                                i % disasterColorSchemes.length
                                            ]}
                                        />
                                    ))
                                ) : (
                                    <Line
                                        dataKey="total"
                                        name="Disaster internal displacements"
                                        stroke="var(--color-disaster)"
                                        strokeWidth={2}
                                        connectNulls
                                        dot
                                    />
                                )}
                            </LineChart>
                            <PieChart
                                width={280}
                                height={200}
                                className={styles.chart}
                            >
                                <Tooltip
                                    formatter={formatNumber}
                                />
                                <Legend />
                                <Pie
                                    data={filteredPieData}
                                    dataKey="total"
                                    nameKey="label"
                                >
                                    {filteredPieData.map(({ label }, index) => (
                                        <Cell
                                            key={label}
                                            fill={colorScheme[
                                                index % colorScheme.length
                                            ]}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </div>
                    </div>
                </div>
                <div className={styles.footerContainer}>
                    <Button
                        name="download"
                        onClick={handleDownloadClick}
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
                        itemsCount={totalCount}
                        maxItemsPerPage={pageSize}
                        onActivePageChange={setActivePage}
                        onItemsPerPageChange={setPageSize}
                    />
                </div>
                <div className={styles.tableContainer}>
                    <SortContext.Provider value={sortState}>
                        <Table
                            data={paginatedData}
                            className={styles.table}
                            keySelector={disasterItemKeySelector}
                            columns={columns}
                        />
                    </SortContext.Provider>
                </div>
            </div>
        </div>
    );
}

export default Disaster;
