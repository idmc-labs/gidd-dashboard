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
} from '@togglecorp/fujs';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
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
import {
    requiredCondition,
    useForm,
    ObjectSchema,
} from '@togglecorp/toggle-form';
import { IoMdDownload } from 'react-icons/io';
import useDebouncedValue from '#hooks/useDebouncedValue';

import {
    createTextColumn,
    createNumberColumn,
} from '#components/tableHelpers';
import CustomBar from '#components/CurvedBar';
import { useRequest } from '#utils/request';
import {
    MultiResponse,
    add,
    valueFormatter,
    valueFormatterWithoutPrecision,
    regions,
    useDownloading,
    regionMap,
    calcPieSizes,
    removeZero,
    round,
} from '#utils/common';
import { currentYear } from '#config/env';

import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';
import Slider from '../Slider';

const colorScheme = [
    '#06169e',
    '#0738c8',
    '#0774e1',
    '#018ec9',
    '#2cb7e1',
    '#5ed9ed',
];

interface FilterFields {
    years: [number, number];
    regions: string[];
    countries: string[];
    disasterType: string[];
}

type FormType = FilterFields;

type FormSchema = ObjectSchema<FormType>
type FormSchemaFields = ReturnType<FormSchema['fields']>;

const schema: FormSchema = {
    fields: (): FormSchemaFields => ({
        years: [requiredCondition],
        regions: [],
        countries: [],
        disasterType: [],
    }),
};

const defaultFormValues: FormType = {
    years: [2008, currentYear],
    regions: [],
    countries: [],
    disasterType: [],
};

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

function subTypeTransformer(subType = '') {
    if (subType.toLowerCase() === 'wet mass movement') {
        return 'Wet Mass Movement';
    }
    if (subType === 'Volcanic eruption' || subType === 'Volcanic activity') {
        return 'Volcanic eruption';
    }
    return subType;
}

const inputKeySelector = (d: Item) => d.key;
const inputValueSelector = (d: Item) => d.value;

const groupedItemKeySelector = (item: ItemWithGroup) => item.key;
const groupedItemLabelSelector = (item: ItemWithGroup) => item.value;

const groupKeySelector = (item: ItemWithGroup) => item.parent;
const groupLabelSelector = (item: ItemWithGroup) => item.parent;

interface Props {
    className?: string;
    onSelectedPageChange: (pageType: PageType) => void;
}

function Disaster(props: Props) {
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

    const {
        totalCount,
        noOfCountries,
        filteredData,
        filteredAggregatedData,
        filteredPieData,
        noTotal,
    } = useMemo(() => {
        if (!response?.results) {
            return {
                filteredData: [],
                filteredAggregatedData: [],
                filteredPieData: [],
                noOfCountries: 0,
                totalCount: 0,
                noTotal: 0,
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
                finalFormValue.disasterType.length === 0
                || finalFormValue.disasterType.indexOf(subTypeTransformer(d.hazard_type)) !== -1
            ) && (
                finalFormValue.regions.length === 0
                || regionCountries.indexOf(d.iso3) !== -1
            ) && (isDefined(d.new_displacements) && d.new_displacements !== 0)
        )).map((d) => ({
            ...d,
            key: randomString(),
            hazard_type: subTypeTransformer(d.hazard_type),
            new_displacements: removeZero(d.new_displacements),
        }));
        const dataByYear = listToGroupList(newFilteredData, (d) => d.year);
        const dataTotalByYear = mapToList(dataByYear, (d, k) => (
            ({
                year: k,
                total: add(
                    d.map((datum) => datum.new_displacements).filter((datum) => isDefined(datum)),
                ),
            })
        ));
        const dataByHazardType = listToGroupList(newFilteredData, (d) => d.hazard_type);
        const dataTotalByHazardType = mapToList(dataByHazardType, (d, k) => (
            ({
                label: String(k),
                total: add(
                    d.map((datum) => datum.new_displacements).filter((datum) => isDefined(datum)),
                ) ?? 0,
            })
        ));
        const pies = calcPieSizes(dataTotalByHazardType);
        const totalNewDisplacements = sum(
            newFilteredData.map((d) => d.new_displacements).filter(isDefined),
        );
        return {
            filteredData: newFilteredData,
            noOfCountries: unique(newFilteredData, (d) => d.iso3).length,
            totalCount: newFilteredData.length,
            noTotal: totalNewDisplacements,
            filteredAggregatedData: dataTotalByYear,
            filteredPieData: pies,
        };
    }, [response?.results, finalFormValue]);

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
                (item) => round(item.new_displacements),
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
        const url = 'https://idmc-labs.github.io/gidd-dashboard/assets/ReadMeFile_GIDD.docx';
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ReadMeFile_GIDD.docx';
        a.click();
    }, [handleDownload]);

    return (
        <div className={_cs(className, styles.disaster)}>
            {pending && <PendingMessage className={styles.pending} />}
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
                <div className={styles.filters}>
                    <MultiSelectInput
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
                        className={styles.filter}
                        keySelector={inputKeySelector}
                        label="Countries and territories"
                        labelSelector={inputValueSelector}
                        name="countries"
                        onChange={onValueChange}
                        options={countriesList}
                        optionsPopupClassName={styles.popup}
                        value={value.countries}
                    />
                    <MultiSelectInput<string, 'disasterType', ItemWithGroup, any>
                        className={styles.filter}
                        keySelector={groupedItemKeySelector}
                        label="Disaster Category"
                        labelSelector={groupedItemLabelSelector}
                        name="disasterType"
                        onChange={onValueChange}
                        options={subTypeList}
                        optionsPopupClassName={styles.popup}
                        value={value.disasterType}
                        groupKeySelector={groupKeySelector}
                        groupLabelSelector={groupLabelSelector}
                        grouped
                    />
                    <Slider
                        className={_cs(styles.slider, styles.filter)}
                        name="years"
                        min={2008}
                        max={currentYear}
                        step={1}
                        onChange={onValueChange}
                        value={value.years}
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
                            <BarChart
                                width={320}
                                height={200}
                                data={filteredAggregatedData}
                                className={styles.chart}
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
                                    tickFormatter={valueFormatterWithoutPrecision}
                                />
                                <Tooltip
                                    formatter={valueFormatter}
                                />
                                <Legend />
                                <Bar
                                    dataKey="total"
                                    fill="var(--color-disaster)"
                                    name="Disaster internal displacements"
                                    shape={<CustomBar />}
                                    maxBarSize={16}
                                />
                            </BarChart>
                            <PieChart
                                width={280}
                                height={200}
                                className={styles.chart}
                            >
                                <Tooltip
                                    formatter={valueFormatter}
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
