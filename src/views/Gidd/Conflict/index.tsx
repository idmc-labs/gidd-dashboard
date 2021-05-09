import React, { useMemo, useState, useCallback } from 'react';
import {
    _cs,
    sum,
    isDefined,
    unique,
    compareString,
    compareNumber,
} from '@togglecorp/fujs';
import {
    MultiSelectInput,
    Button,
    createNumberColumn,
    Table,
    Pager,
    SortContext,
    useSortState,
} from '@togglecorp/toggle-ui';
import {
    requiredCondition,
    useForm,
    createSubmitHandler,
    PartialForm,
    PurgeNull,
    ObjectSchema,
} from '@togglecorp/toggle-form';

import { createTextColumn } from '#components/tableHelpers';
import { useRequest } from '#utils/request';
import { MultiResponse } from '#utils/common';

import { PageType } from '..';
import NumberBlock from '../NumberBlock';
import styles from './styles.css';
import Slider from '../Slider';

interface FilterFields {
    years: [number, number];
    regions: string[];
    countries: string[];
}

type FormType = PurgeNull<PartialForm<FilterFields>>;

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
}

const inputKeySelector = (d: Item) => d.key;
const inputValueSelector = (d: Item) => d.value;

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

function Conflict(props: Props) {
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
        setFinalFormValue(finalValue);
    }, []);

    const {
        response,
    } = useRequest<MultiResponse<ConflictData>>({
        url: 'https://api.idmcdb.org/api/conflict_data',
        query: {
            ci: 'IDMCWSHSOLO009',
        },
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
        }));
    }, [response?.results]);

    const {
        totalCount,
        noOfCountries,
        filteredData,
        noTotal,
        noAsOfEnd,
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
        const newFilteredData = response.results.filter((d) => (
            (
                Number(d.year) >= finalFormValue.years[0]
                && Number(d.year) <= finalFormValue.years[1]
            ) && (
                finalFormValue.countries.length === 0
                || finalFormValue.countries.indexOf(d.iso3) !== -1
            )
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
            noAsOfEnd: totalStock,
        };
    }, [response?.results, finalFormValue]);

    const paginatedData = useMemo(() => {
        const finalPaginatedData = [...filteredData];
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
                'iso3',
                'ISO3',
                (item) => item.iso3,
                { sortable: true },
            ),
            createTextColumn<ConflictData, string>(
                'name',
                'Name',
                (item) => item.geo_name,
                { sortable: true },
            ),
            createNumberColumn<ConflictData, string>(
                'year',
                'Year',
                (item) => Number(item.year),
                { sortable: true },
            ),
            createNumberColumn<ConflictData, string>(
                'stock_displacement',
                'Conflict Stock Displacement',
                (item) => item.stock_displacement,
                { sortable: true },
            ),
            createNumberColumn<ConflictData, string>(
                'new_displacements',
                'Conflict New Displacement',
                (item) => item.new_displacements,
                { sortable: true },
            ),
        ]),
        [],
    );

    return (
        <div className={_cs(className, styles.conflict)}>
            <header className={styles.header}>
                <h1 className={styles.heading}>IDMC Query Tool - Conflict and Violence</h1>
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
                    <MultiSelectInput
                        name="countries"
                        className={styles.filter}
                        label="Countries"
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
                            label="Conflict and Violence"
                            subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                            value={noTotal}
                            variant="conflict"
                            size="medium"
                        />
                        <NumberBlock
                            className={styles.numberBlock}
                            label="Conflict and Violence"
                            value={noAsOfEnd}
                            subLabel={`As of end of ${finalFormValue.years[1]}`}
                            variant="conflict"
                            size="medium"
                        />
                    </div>
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

export default Conflict;
