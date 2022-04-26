import React, { useCallback } from 'react';
import { _cs } from '@togglecorp/fujs';
import MuiSlider from '@material-ui/core/Slider';

import styles from './styles.css';

type SliderValue = [number, number];

interface Props<T> {
    className?: string;
    name: T;
    onChange: (newValue: SliderValue, name: T) => void;
    value?: SliderValue;
    min: number;
    max: number;
    step: number;
}

function Slider<T extends string>(props: Props<T>) {
    const {
        className,
        value,
        min,
        max,
        step,
        onChange,
        name,
    } = props;

    const handleChange = useCallback((_, newValue) => {
        onChange(newValue, name);
    }, [onChange, name]);

    return (
        <div className={_cs(styles.sliderContainer, className)}>
            <MuiSlider
                min={min}
                max={max}
                step={step}
                value={value ?? [min, max]}
                onChange={handleChange}
                valueLabelDisplay="on"
                aria-labelledby="range-slider"
            />
        </div>
    );
}

export default Slider;
