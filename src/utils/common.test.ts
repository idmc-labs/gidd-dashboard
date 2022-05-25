import {
    roundAndRemoveZero,
} from './common';

test('Round and remove zero', () => {
    expect(roundAndRemoveZero(undefined)).toBe(undefined);
    expect(roundAndRemoveZero(0)).toBe(undefined);
    expect(roundAndRemoveZero(249)).toBe(240);
    expect(roundAndRemoveZero(2311)).toBe(3200);
    expect(roundAndRemoveZero(39080)).toBe(39000);
    expect(roundAndRemoveZero(39080123)).toBe(39000000);
});
