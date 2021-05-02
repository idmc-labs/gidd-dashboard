import React, { useState, useCallback } from 'react';
import { _cs } from '@togglecorp/fujs';
import {
    MultiSelectInput,
    Button,
} from '@togglecorp/toggle-ui';
import {
    requiredCondition,
    useForm,
    createSubmitHandler,
    PartialForm,
    PurgeNull,
    ObjectSchema,
} from '@togglecorp/toggle-form';

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

const countries: Item[] = [
    {
        key: '1',
        value: 'Nepal',
    },
    {
        key: '2',
        value: 'India',
    },
    {
        key: '3',
        value: 'Switzerland',
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

    const handleBackButton = useCallback(() => {
        onSelectedPageChange('map');
    }, [onSelectedPageChange]);

    const handleSubmit = useCallback((finalValue: FormType) => {
        setFinalFormValue(finalValue);
    }, []);

    const noOfCountries = 67;
    const noTotal = 120700000;

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
                    />
                    <MultiSelectInput
                        name="countries"
                        className={styles.filter}
                        label="Countries"
                        options={countries}
                        keySelector={inputKeySelector}
                        labelSelector={inputValueSelector}
                        value={value.countries}
                        onChange={onValueChange}
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
            </div>
        </div>
    );
}

export default Disaster;
