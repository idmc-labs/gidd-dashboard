import React, { useCallback } from 'react';
import { _cs } from '@togglecorp/fujs';
import MuiSlider from '@material-ui/core/Slider';

import styles from './styles.css';

type SliderValue = [number, number];

interface Props {
    className?: string;
    name: string;
    onChange: (newValue: SliderValue | undefined, name: string) => void;
    value?: SliderValue | null;
    min: number;
    max: number;
    step: number;
}

function Slider(props: Props) {
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
