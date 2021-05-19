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
    useDownloading,
    convertTableData,
    PendingMessage,
} from '@togglecorp/toggle-ui';
import {
    requiredCondition,
    useForm,
    ObjectSchema,
} from '@togglecorp/toggle-form';

import CustomBar from '#components/CurvedBar';
import {
    createTextColumn,
    createNumberColumn,
} from '#components/tableHelpers';
import { useRequest } from '#utils/request';
import {
    MultiResponse,
    add,
    valueFormatter,
    regions,
    regionMap,
    removeZero,
    round,
} from '#utils/common';

import useDebouncedValue from '#hooks/useDebouncedValue';
import readMe from '#resources/ReadMeFile_GIDD.docx';
import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';
import Slider from '../Slider';

interface FilterFields {
    years: [number, number];
    regions: string[];
    countries: string[];
}

type FormType = FilterFields;

type FormSchema = ObjectSchema<FormType>
type FormSchemaFields = ReturnType<FormSchema['fields']>;

const schema: FormSchema = {
    fields: (): FormSchemaFields => ({
        years: [requiredCondition],
        regions: [],
        countries: [],
    }),
};

const defaultFormValues: FormType = {
    years: [2008, 2020],
    regions: [],
    countries: [],
};

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

    const {
        value,
        onValueChange,
    } = useForm(defaultFormValues, schema);

    const [activePage, setActivePage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

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
        url: 'https://api.idmcdb.org/api/conflict_data?ci=IDMCWSHSOLO009&year=2008&year=2020&range=true',
        /*
        query: {
            ci: 'IDMCWSHSOLO009',
            year: 2008,
            range: true,
        },
        */
        method: 'GET',
    });

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

    const {
        totalCount,
        noOfCountries,
        filteredData,
        noTotal,
        noAsOfEnd,
        filteredAggregatedData,
    } = useMemo(() => {
        if (!response?.results) {
            return {
                filteredData: [],
                noOfCountries: 0,
                totalCount: 0,
                noTotal: 0,
                noAsOfEnd: 0,
            };
        }
        const regionCountries = finalFormValue.regions.map((r) => regionMap[r]).flat();
        const newFilteredData = response.results.filter((d) => (
            (
                Number(d.year) >= finalFormValue.years[0]
                && Number(d.year) <= finalFormValue.years[1]
            ) && (
                finalFormValue.countries.length === 0
                || finalFormValue.countries.indexOf(d.iso3) !== -1
            ) && (
                finalFormValue.regions.length === 0
                || regionCountries.indexOf(d.iso3) !== -1
            )

        )).map((d) => ({
            ...d,
            new_displacements: removeZero(d.new_displacements),
            stock_displacement: removeZero(d.stock_displacement),
        }));
        const dataByYear = listToGroupList(newFilteredData, (d) => d.year);
        const dataTotalByYear = mapToList(dataByYear, (d, k) => (
            ({
                year: k,
                total: add(
                    d.map((datum) => datum.new_displacements).filter((datum) => isDefined(datum)),
                ),
                totalStock: add(
                    d.map((datum) => datum.stock_displacement).filter((datum) => isDefined(datum)),
                ),
            })
        ));
        const totalNewDisplacements = sum(
            newFilteredData.map((d) => d.new_displacements).filter(isDefined),
        );
        const totalStock = sum(
            newFilteredData
                .filter((d) => Number(d.year) === finalFormValue.years[1])
                .map((d) => d.stock_displacement).filter(isDefined),
        );
        return {
            filteredData: newFilteredData,
            noOfCountries: unique(newFilteredData, (d) => d.iso3).length,
            totalCount: newFilteredData.length,
            noTotal: totalNewDisplacements,
            filteredAggregatedData: dataTotalByYear,
            noAsOfEnd: totalStock,
        };
    }, [response?.results, finalFormValue]);

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
                (item) => round(item.stock_displacement),
                {
                    sortable: true,
                },
            ),
            createNumberColumn<ConflictData, string>(
                'new_displacements',
                'Conflict New Displacements',
                (item) => round(item.new_displacements),
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

    const getCsvValue = useCallback(
        () => convertTableData(
            filteredData,
            columnsForDownload,
        ),
        [filteredData, columnsForDownload],
    );

    const handleDownload = useDownloading(
        'IDMC_GIDD_conflict_internal_displacement_data_2020',
        getCsvValue,
    );

    const handleDownloadClick = useCallback(() => {
        handleDownload();
        const url = readMe;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ReadMeFile_GIDD.docx';
        a.click();
    }, [handleDownload]);

    return (
        <div className={_cs(className, styles.conflict)}>
            {pending && <PendingMessage className={styles.pending} />}
            <header className={styles.header}>
                <h1 className={styles.heading}>IDMC Query Tool - Conflict and Violence</h1>
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
                <div className={styles.filters}>
                    <MultiSelectInput<string, 'regions', Item, any>
                        name="regions"
                        className={styles.filter}
                        label="Regions"
                        options={regions}
                        keySelector={inputKeySelector}
                        labelSelector={inputValueSelector}
                        value={value.regions}
                        onChange={onValueChange}
                        optionsPopupClassName={styles.popup}
                    />
                    <MultiSelectInput<string, 'countries', Item, any>
                        name="countries"
                        className={styles.filter}
                        label="Countries and territories"
                        options={countriesList}
                        keySelector={inputKeySelector}
                        labelSelector={inputValueSelector}
                        value={value.countries}
                        onChange={onValueChange}
                        optionsPopupClassName={styles.popup}
                    />
                    <Slider
                        className={_cs(styles.slider, styles.filter)}
                        name="years"
                        min={2008}
                        max={2020}
                        step={1}
                        onChange={onValueChange}
                        value={value.years}
                    />
                </div>
                <div className={styles.informationBar}>
                    <h2 className={styles.infoHeading}>
                        {`New displacements and total number of IDPs from
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
                                    label="New displacements"
                                    secondarySubLabel="Conflict and Violence"
                                    subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                                    value={noTotal}
                                    variant="conflict"
                                    size="medium"
                                />
                                <NumberBlock
                                    className={styles.numberBlock}
                                    label="Total number of IDPs"
                                    secondarySubLabel="Conflict and Violence"
                                    value={noAsOfEnd}
                                    subLabel={`As of end of ${finalFormValue.years[1]}`}
                                    variant="conflict"
                                    size="medium"
                                />
                            </div>
                        </div>
                        <div className={styles.chartsContainer}>
                            <BarChart
                                className={styles.chart}
                                width={320}
                                height={200}
                                data={filteredAggregatedData}
                            >
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                />
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="3 3"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickFormatter={valueFormatter}
                                />
                                <Tooltip
                                    formatter={valueFormatter}
                                />
                                <Legend />
                                <Bar
                                    dataKey="total"
                                    fill="var(--color-conflict)"
                                    name="Conflict new displacements"
                                    shape={<CustomBar />}
                                    maxBarSize={16}
                                />
                            </BarChart>
                            <LineChart
                                className={styles.chart}
                                width={320}
                                height={200}
                                data={filteredAggregatedData}
                            >
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                />
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="3 3"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickFormatter={valueFormatter}
                                />
                                <Tooltip
                                    formatter={valueFormatter}
                                />
                                <Legend />
                                <Line
                                    dataKey="totalStock"
                                    name="Conflict total number of IDPs"
                                    key="totalStock"
                                    stroke="var(--color-conflict)"
                                    strokeWidth={2}
                                    connectNulls
                                    dot
                                />
                            </LineChart>
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
