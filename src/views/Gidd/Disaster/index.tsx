import React, { useMemo, useState, useCallback } from 'react';
import {
    _cs,
    sum,
    randomString,
    isDefined,
    unique,
} from '@togglecorp/fujs';
import {
    MultiSelectInput,
    Button,
    createNumberColumn,
    createDateColumn,
    Table,
    Pager,
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
    hazard_type: string;
}

const disasterItemKeySelector = (d: DisasterData) => d.key;
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

    const handleBackButton = useCallback(() => {
        onSelectedPageChange('map');
    }, [onSelectedPageChange]);

    const handleSubmit = useCallback((finalValue: FormType) => {
        setFinalFormValue(finalValue);
    }, []);

    const {
        response,
    } = useRequest<MultiResponse<DisasterData>>({
        url: 'https://api.idmcdb.org/api/disaster_data',
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
                (d: DisasterData) => d.iso3),
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
            )
        )).map((d) => ({ ...d, key: randomString() }));
        const totalNewDisplacements = sum(
            newFilteredData.map((d) => d.new_displacements).filter(isDefined),
        );
        return {
            filteredData: newFilteredData,
            noOfCountries: unique(newFilteredData, (d) => d.iso3).length,
            totalCount: newFilteredData.length,
            noTotal: totalNewDisplacements,
        };
    }, [response?.results, finalFormValue]);

    const paginatedData = useMemo(() => {
        const finalPaginatedData = [...filteredData];
        finalPaginatedData.splice(0, (activePage - 1) * pageSize);
        finalPaginatedData.length = pageSize;
        return finalPaginatedData;
    }, [activePage, pageSize, filteredData]);

    const columns = useMemo(
        () => ([
            createTextColumn<DisasterData, string>(
                'iso3',
                'ISO3',
                (item) => item.iso3,
                { sortable: true },
            ),
            createTextColumn<DisasterData, string>(
                'name',
                'Name',
                (item) => item.geo_name,
            ),
            createNumberColumn<DisasterData, string>(
                'year',
                'Year',
                (item) => Number(item.year),
            ),
            createTextColumn<DisasterData, string>(
                'event_name',
                'Event Name',
                (item) => item.event_name ?? item.glide_number,
            ),
            createDateColumn<DisasterData, string>(
                'start_date',
                'Date of event (start)',
                (item) => item.start_date,
            ),
            createNumberColumn<DisasterData, string>(
                'newDisplacement',
                'Disaster New Displacement',
                (item) => item.new_displacements,
            ),
            createTextColumn<DisasterData, string>(
                'hazard_category',
                'Hazard Category',
                (item) => item.hazard_category,
            ),
            createTextColumn<DisasterData, string>(
                'hazard_type',
                'Hazard Type',
                (item) => item.hazard_type,
            ),
        ]),
        [],
    );

    return (
        <div className={_cs(className, styles.disaster)}>
            <header className={styles.header}>
                <h1 className={styles.heading}>IDMC Query Tool - Disaster and Violence</h1>
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
                            label="Disaster and Violence"
                            subLabel={`${finalFormValue.years[0]} - ${finalFormValue.years[1]}`}
                            value={noTotal}
                            variant="disaster"
                            size="medium"
                        />
                    </div>
                </div>
                <div className={styles.tableContainer}>
                    <Table
                        data={paginatedData}
                        className={styles.table}
                        keySelector={disasterItemKeySelector}
                        columns={columns}
                    />
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
