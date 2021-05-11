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
    createNumberColumn,
    createDateColumn,
    SortContext,
    useSortState,
} from '@togglecorp/toggle-ui';
import {
    requiredCondition,
    useForm,
    createSubmitHandler,
    ObjectSchema,
} from '@togglecorp/toggle-form';

import { createTextColumn } from '#components/tableHelpers';
import CustomBar from '#components/CurvedBar';
import { useRequest } from '#utils/request';
import {
    MultiResponse,
    add,
} from '#utils/common';

import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';
import Slider from '../Slider';

/*
interface AggregatedData {
    year: number;
    // eslint-disable-next-line camelcase
    conflict_new_displacements?: number;
    // eslint-disable-next-line camelcase
    disaster_new_displacements?: number;
}
*/

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
    years: [2008, 2020],
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

const regions: Item[] = [
    {
        key: '1',
        value: 'Asia',
    },
    {
        key: '2',
        value: 'Africa',
    },
    {
        key: '3',
        value: 'Europe',
    },
];

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
        pristine,
        value,
        onValueChange,
        validate,
        onErrorSet,
    } = useForm(defaultFormValues, schema);

    const [finalFormValue, setFinalFormValue] = useState<FilterFields>(defaultFormValues);
    const [activePage, setActivePage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const sortState = useSortState();
    const { sorting } = sortState;

    const handleBackButton = useCallback(() => {
        onSelectedPageChange('map');
    }, [onSelectedPageChange]);

    const handleSubmit = useCallback((finalValue: FormType) => {
        setActivePage(1);
        setFinalFormValue(finalValue);
    }, []);

    /*
    const {
        response: aggregatedDataResponse,
    } = useRequest<AggregatedData[]>({
        url: 'https://api.idmcdb.org/api/psql/new_displacements_by_year',
        query: {
            ci: 'IDMCWSHSOLO009',
        },
        method: 'GET',
    });

    const filteredAggregatedData = useMemo(() => {
        if (!aggregatedDataResponse) {
            return [];
        }
        return aggregatedDataResponse.filter((d) => (
            (
                Number(d.year) >= finalFormValue.years[0]
                && Number(d.year) <= finalFormValue.years[1]
            )
        ));
    }, [finalFormValue, aggregatedDataResponse]);
    */

    const {
        response,
    } = useRequest<MultiResponse<DisasterData>>({
        url: 'https://api.idmcdb.org/api/disaster_data?ci=IDMCWSHSOLO009&year=2008&year=2020&range=true',
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
        }));
        // NOTE: I've grouped sub types based on hazard category
        const subTypes = unique(
            response.results.filter((d) => isDefined(d.hazard_type),
                (d: DisasterData) => d.hazard_type),
        ).map((d) => ({
            key: d.hazard_type,
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
        noTotal,
    } = useMemo(() => {
        if (!response?.results) {
            return {
                filteredData: [],
                noOfCountries: 0,
                totalCount: 0,
                noTotal: 0,
            };
        }
        const newFilteredData = response.results.filter((d) => (
            (
                Number(d.year) >= finalFormValue.years[0]
                && Number(d.year) <= finalFormValue.years[1]
            ) && (
                finalFormValue.countries.length === 0
                || finalFormValue.countries.indexOf(d.iso3) !== -1
            ) && (
                finalFormValue.disasterType.length === 0
                || finalFormValue.disasterType.indexOf(d.hazard_sub_type) !== -1
            )
        )).map((d) => ({ ...d, key: randomString() }));
        const dataByYear = listToGroupList(newFilteredData, (d) => d.year);
        const dataTotalByYear = mapToList(dataByYear, (d, k) => (
            ({
                year: k,
                total: add(
                    d.map((datum) => datum.new_displacements).filter((datum) => isDefined(datum)),
                ),
            })
        ));
        const totalNewDisplacements = sum(
            newFilteredData.map((d) => d.new_displacements).filter(isDefined),
        );
        return {
            filteredData: newFilteredData,
            noOfCountries: unique(newFilteredData, (d) => d.iso3).length,
            totalCount: newFilteredData.length,
            noTotal: totalNewDisplacements,
            filteredAggregatedData: dataTotalByYear,
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
                'Name',
                (item) => item.geo_name ?? countriesList.find((c) => c.key === item.iso3)?.value,
                { sortable: true },
            ),
            createNumberColumn<DisasterData, string>(
                'year',
                'Year',
                (item) => Number(item.year),
                { sortable: true },
            ),
            createTextColumn<DisasterData, string>(
                'event_name',
                'Event Name',
                (item) => item.event_name ?? item.glide_number,
                { sortable: true },
            ),
            createDateColumn<DisasterData, string>(
                'start_date',
                'Date of event (start)',
                (item) => item.start_date,
                { sortable: true },
            ),
            createNumberColumn<DisasterData, string>(
                'new_displacements',
                'Disaster New Displacement',
                (item) => item.new_displacements,
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

    return (
        <div className={_cs(className, styles.disaster)}>
            <header className={styles.header}>
                <h1 className={styles.heading}>IDMC Query Tool - Disaster</h1>
                <Button
                    className={styles.button}
                    name="back"
                    onClick={handleBackButton}
                >
                    Go back
                </Button>
            </header>
            <div className={styles.content}>
                <form
                    className={styles.filters}
                    onSubmit={createSubmitHandler(validate, onErrorSet, handleSubmit)}
                >
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
                        className={styles.filter}
                        keySelector={inputKeySelector}
                        label="Countries"
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
                        max={2020}
                        step={1}
                        onChange={onValueChange}
                        value={value.years}
                    />
                    <Button
                        className={styles.button}
                        name={undefined}
                        variant="primary"
                        type="submit"
                        disabled={pristine}
                    >
                        Apply
                    </Button>
                </form>
                <div className={styles.informationBar}>
                    <h2 className={styles.infoHeading}>
                        {`New Displacement from
                            ${finalFormValue.years[0]} to ${finalFormValue.years[1]}
                        `}
                    </h2>
                    <div className={styles.numbersContainer}>
                        <NumberBlock
                            label="Countries"
                            className={styles.numberBlock}
                            value={noOfCountries}
                            variant="normal"
                            size="large"
                        />
                        <NumberBlock
                            className={styles.numberBlock}
                            label="Disasters"
                            subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                            value={noTotal}
                            variant="disaster"
                            size="medium"
                        />
                    </div>
                    <BarChart
                        width={500}
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
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                            dataKey="total"
                            fill="var(--color-disaster)"
                            name="Disaster new displacements"
                            shape={<CustomBar />}
                            maxBarSize={16}
                        />
                    </BarChart>
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
                <div className={styles.footerContainer}>
                    <Pager
                        activePage={activePage}
                        itemsCount={totalCount}
                        maxItemsPerPage={pageSize}
                        onActivePageChange={setActivePage}
                        onItemsPerPageChange={setPageSize}
                    />
                </div>
            </div>
        </div>
    );
}

export default Disaster;
