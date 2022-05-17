import React, { RefCallback, HTMLProps } from 'react';
import ReactSlider from 'react-slider';
import { _cs } from '@togglecorp/fujs';

import Header from '#components/Header';

import styles from './styles.css';

interface HTMLPropsWithRefCallback<T> extends HTMLProps<T> {
    ref: RefCallback<T>;
}

function Mark(
    props: HTMLPropsWithRefCallback<HTMLDivElement>,
) {
    return (
        <span
            {...props}
            className={styles.mark}
        />
    );
}

interface HTMLPropsWithRefCallback<T> extends HTMLProps<T> {
    ref: RefCallback<T>;
}

function Thumb(
    props: HTMLPropsWithRefCallback<HTMLDivElement>,
) {
    return (
        <div
            {...props}
            className={styles.thumb}
        />
    );
}

function Track<T extends number | number[]>(
    props: HTMLPropsWithRefCallback<HTMLDivElement>,
    state: { index: number; value: T },
) {
    const { index } = state;
    return (
        <div
            {...props}
            // index={index}
            className={_cs(
                styles.track,
                index === 1 && styles.center,
            )}
        />
    );
}

interface Props<T extends number | number[]> {
    className?: string;
    min: number;
    max: number;
    labelDescription?: React.ReactNode;
    value: T;
    onChange: (value: T) => void;
    step: number;
    minDistance: number;
    hideValues?: boolean;
    label?: string;
}

function Slider<T extends number | number[]>(props: Props<T>) {
    const {
        min,
        max,
        className,
        value,
        onChange,
        step,
        label = 'Timescale',
        labelDescription,
        minDistance,
        hideValues,
    } = props;

    const marks = Array.from(
        { length: max - min + 1 },
        (_, i) => i + min,
    );

    return (
        <Header
            heading={label}
            headingSize="extraSmall"
            headingDescriptionClassName={_cs(
                styles.headingDescription,
            )}
            className={_cs(styles.slider, className)}
            headingDescription={(
                <span>
                    {labelDescription}
                </span>
            )}
            inlineHeadingDescription
            description={(
                <>
                    {typeof value !== 'number' && !hideValues && (
                        <div>
                            {value[0]}
                        </div>
                    )}
                    <ReactSlider
                        className={styles.reactSlider}
                        min={min}
                        max={max}
                        step={step}
                        marks={marks}
                        minDistance={minDistance}
                        pearling
                        value={value}
                        onChange={onChange}
                        renderThumb={Thumb}
                        renderTrack={Track}
                        renderMark={Mark}
                    />
                    {typeof value !== 'number' && !hideValues && (
                        <div>
                            {value[1]}
                        </div>
                    )}
                </>
            )}
        />
    );
}

export default Slider;
