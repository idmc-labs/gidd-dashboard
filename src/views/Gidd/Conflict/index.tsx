import React, { useMemo, useState, useCallback } from 'react';
import {
    _cs,
    sum,
    isDefined,
    unique,
    compareString,
    compareNumber,
    listToGroupList,
    mapToList,
    mapToMap,
    isNotDefined,
} from '@togglecorp/fujs';
import { IoMdDownload } from 'react-icons/io';
import {
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
    LineChart,
    Line,
} from 'recharts';
import {
    MultiSelectInput,
    Button,
    Table,
    Pager,
    SortContext,
    useSortState,
    convertTableData,
    PendingMessage,
} from '@togglecorp/toggle-ui';

import CustomBar from '#components/CurvedBar';
import Header from '#components/Header';
import {
    createTextColumn,
    createNumberColumn,
} from '#components/tableHelpers';
import { useRequest } from '#utils/request';
import { currentYear } from '#config/env';
import {
    MultiResponse,
    // add,
    useDownloading,
    formatNumber,
    regions,
    regionMap,
    removeZero,
    roundAndRemoveZero,
} from '#utils/common';

import useDebouncedValue from '#hooks/useDebouncedValue';
import SliderInput from '#components/SliderInput';
import useInputState from '#hooks/useInputState';
import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';
// import Slider from '../Slider';

// NOTE: we only need 3 colors
const conflictColorSchemes = [
    // 'rgb(196, 56, 34)',
    // 'rgb(222, 71, 38)',
    // 'rgb(235, 99, 36)',
    'rgb(239, 125, 0)',
    'rgb(242, 179, 120)',
    'rgb(247, 204, 166)',
];

const chartMargins = { top: 16, left: 16, right: 16, bottom: 5 };

interface ConflictData {
    iso3: string;
    // eslint-disable-next-line camelcase
    geo_name: string;
    year: string;
    // eslint-disable-next-line camelcase
    stock_displacement?: number;
    // eslint-disable-next-line camelcase
    new_displacements?: number;
}

function filterConflictData(
    data: ConflictData[],
    regionsFilter: string[],
    countries: string[],
    years: number[],
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
            regionsFilter.length === 0
            || regionCountries.indexOf(d.iso3) !== -1
        )
    )).map((d) => ({
        ...d,
        new_displacements: removeZero(d.new_displacements),
        stock_displacement: removeZero(d.stock_displacement),
    }));
}

function aggregateByYear(lst: { year: number, iso3: string, value: number}[]) {
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

// NOTE: we use this only after filtering the data
function processConflictData(data: ConflictData[], reportingYear: number) {
    const newDisplacements = data.map((item) => {
        if (isNotDefined(item.new_displacements)) {
            return undefined;
        }
        return {
            year: Number(item.year),
            iso3: item.iso3,
            value: item.new_displacements,
        };
    }).filter(isDefined);
    const idps = data.map((item) => {
        if (isNotDefined(item.stock_displacement)) {
            return undefined;
        }
        return {
            year: Number(item.year),
            iso3: item.iso3,
            value: item.stock_displacement,
        };
    }).filter(isDefined);

    const totalNewDisplacements = sum(
        newDisplacements
            .map((d) => d.value)
            .filter(isDefined),
    );
    const totalIdps = sum(
        idps
            .filter((d) => Number(d.year) === reportingYear)
            .map((d) => d.value)
            .filter(isDefined),
    );

    const newDisplacementsByYear = aggregateByYear(newDisplacements);

    const idpsByYear = aggregateByYear(idps);

    return {
        totalNewDisplacements,
        totalIdps,

        newDisplacementsByYear,
        idpsByYear,
    };
}

const conflictItemKeySelector = (d: ConflictData) => `${d.iso3}-${d.year}`;

interface Item {
    key: string;
    value: string;
    countries?: string[];
}

const inputKeySelector = (d: Item) => d.key;
const inputValueSelector = (d: Item) => d.value;

interface Props {
    className?: string;
    onSelectedPageChange: (pageType: PageType) => void;
}

function Conflict(props: Props) {
    const {
        className,
        onSelectedPageChange,
    } = props;

    const [activePage, setActivePage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    const [regionsValue, setRegionsValue] = useInputState<string[]>([]);
    const [countriesValue, setCountriesValue] = useInputState<string[]>([]);
    const [years, setYears] = useState<number[]>([2008, currentYear]);

    const value = useMemo(() => ({
        regions: regionsValue,
        countries: countriesValue,
        years,
    }), [regionsValue, countriesValue, years]);

    const finalFormValue = useDebouncedValue(value);

    const sortState = useSortState();
    const { sorting } = sortState;

    const handleBackButton = useCallback(() => {
        onSelectedPageChange('map');
    }, [onSelectedPageChange]);

    const {
        pending,
        response,
    } = useRequest<MultiResponse<ConflictData>>({
        url: `https://api.idmcdb.org/api/conflict_data?ci=IDMCWSHSOLO009&year=2008&year=${currentYear}&range=true`,
        /*
        query: {
            ci: 'IDMCWSHSOLO009',
            year: 2008,
            range: true,
        },
        */
        method: 'GET',
    });

    // FIXME: why not make a mapping?
    const countriesList = useMemo(() => {
        if (!response?.results) {
            return [];
        }
        return unique(
            response.results.filter((d) => isDefined(d.geo_name),
                (d: ConflictData) => d.iso3),
        ).map((d) => ({
            key: d.iso3,
            value: d.geo_name,
        })).sort((a, b) => compareString(a.value, b.value));
    }, [response?.results]);

    const multilines = finalFormValue.countries.length > 0
        && finalFormValue.countries.length <= 3;

    const conflictResults = useMemo(() => (
        response?.results.filter(
            (item) => (
                // NOTE: we filter out data with empty stock
                isDefined(item.stock_displacement)
                // NOTE: we filter out data with empty or zero new_displacements
                || (isDefined(item.new_displacements) && item.new_displacements !== 0)
            ),
        )
    ), [response?.results]);

    const filteredData = useMemo(
        () => filterConflictData(
            conflictResults ?? [],
            finalFormValue.regions,
            finalFormValue.countries,
            finalFormValue.years,
        ),
        [finalFormValue, conflictResults],
    );

    const totalCount = filteredData.length;

    const noOfCountries = useMemo(
        () => unique(
            filteredData ?? [],
            (d) => d.iso3,
        ).length,
        [filteredData],
    );

    const {
        totalNewDisplacements: noTotal,
        totalIdps: noAsOfEnd,

        newDisplacementsByYear,
        idpsByYear,
    } = useMemo(
        () => processConflictData(filteredData, finalFormValue.years[1]),
        [filteredData, finalFormValue.years],
    );

    const paginatedData = useMemo(() => {
        const finalPaginatedData = [...filteredData];
        if (sorting) {
            finalPaginatedData.sort((a, b) => {
                if (sorting.name === 'geo_name') {
                    return compareString(
                        a[sorting.name],
                        b[sorting.name],
                        sorting.direction === 'asc' ? 1 : -1,
                    );
                }
                if (
                    sorting.name === 'stock_displacement'
                    || sorting.name === 'new_displacements'
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
            createTextColumn<ConflictData, string>(
                'geo_name',
                'Country / Territory',
                (item) => (
                    item.geo_name ?? countriesList?.find((c) => c.key === item.iso3)?.value
                ),
                { sortable: true },
            ),
            createNumberColumn<ConflictData, string>(
                'year',
                'Year',
                (item) => Number(item.year),
                {
                    sortable: true,
                    separator: '',
                    columnClassName: styles.year,
                },
            ),
            createNumberColumn<ConflictData, string>(
                'stock_displacement',
                'Total number of IDPs',
                (item) => roundAndRemoveZero(item.stock_displacement),
                {
                    sortable: true,
                },
            ),
            createNumberColumn<ConflictData, string>(
                'new_displacements',
                'Conflict Internal Displacements',
                (item) => roundAndRemoveZero(item.new_displacements),
                {
                    sortable: true,
                },
            ),
        ]),
        [countriesList],
    );

    const columnsForDownload = useMemo(
        () => ([
            createTextColumn<ConflictData, string>(
                'iso3',
                'ISO3',
                (item) => item.iso3,
                { sortable: true },
            ),
            ...columns,
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
        `IDMC_GIDD_conflict_internal_displacement_data_${currentYear}`,
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
        <div className={_cs(className, styles.conflict)}>
            <header className={styles.header}>
                <h1 className={styles.heading}>
                    IDMC Query Tool - Conflict and violence
                </h1>
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
                                value={value.regions}
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
                                name="countries"
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                options={countriesList}
                                keySelector={inputKeySelector}
                                labelSelector={inputValueSelector}
                                value={value.countries}
                                onChange={setCountriesValue}
                                optionsPopupClassName={styles.popup}
                            />
                        )}
                    />
                    <SliderInput
                        className={styles.slider}
                        min={2008}
                        max={currentYear}
                        step={1}
                        minDistance={0}
                        labelDescription={`${years[0]}-${years[1]}`}
                        hideValues
                        onChange={setYears}
                        value={years}
                    />
                    {/*
                    <Slider
                        className={_cs(styles.slider, styles.filter)}
                        name="years"
                        min={2008}
                        max={currentYear}
                        step={1}
                        onChange={onValueChange}
                        value={value.years}
                    />
                    */}
                </div>
                <div className={styles.informationBar}>
                    <h2 className={styles.infoHeading}>
                        {`Internal displacements and total number of IDPs from
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
                                    secondarySubLabel="Conflict and violence"
                                    subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                                    value={noTotal}
                                    variant="conflict"
                                    size="medium"
                                />
                                <NumberBlock
                                    className={styles.numberBlock}
                                    label="Total number of IDPs"
                                    secondarySubLabel="Conflict and violence"
                                    value={noAsOfEnd}
                                    subLabel={`As of end of ${finalFormValue.years[1]}`}
                                    variant="conflict"
                                    size="medium"
                                />
                            </div>
                        </div>
                        <div className={styles.chartsContainer}>
                            <LineChart
                                className={styles.chart}
                                width={320}
                                height={200}
                                data={newDisplacementsByYear}
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
                                                    : 'Conflict internal displacements'
                                            }
                                            strokeWidth={2}
                                            connectNulls
                                            dot
                                            stroke={conflictColorSchemes[
                                                i % conflictColorSchemes.length
                                            ]}
                                        />
                                    ))
                                ) : (
                                    <Line
                                        dataKey="total"
                                        name="Conflict internal displacements"
                                        stroke="var(--color-conflict)"
                                        strokeWidth={2}
                                        connectNulls
                                        dot
                                    />
                                )}
                            </LineChart>
                            <BarChart
                                className={styles.chart}
                                width={320}
                                height={200}
                                data={idpsByYear}
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
                                        <Bar
                                            key={item}
                                            dataKey={item}
                                            name={
                                                finalFormValue.countries.length > 1
                                                    ? countriesList.find(
                                                        (c) => c.key === item)?.value || item
                                                    : 'Conflict total number of IDPs'
                                            }
                                            fill={conflictColorSchemes[
                                                i % conflictColorSchemes.length
                                            ]}
                                            shape={<CustomBar />}
                                            maxBarSize={6}
                                        />
                                    ))
                                ) : (
                                    <Bar
                                        dataKey="total"
                                        name="Conflict total number of IDPs"
                                        fill="var(--color-conflict)"
                                        shape={<CustomBar />}
                                        maxBarSize={6}
                                    />
                                )}
                            </BarChart>
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
                            keySelector={conflictItemKeySelector}
                            columns={columns}
                        />
                    </SortContext.Provider>
                </div>
            </div>
        </div>
    );
}

export default Conflict;
