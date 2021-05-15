import {
    isValidUrl as isValidRemoteUrl,
    isDefined,
    sum,
    Lang,
    formattedNormalize,
} from '@togglecorp/fujs';
import {
    BasicEntity,
    EnumEntity,
} from '#types';

export function valueFormatter(value: number) {
    const {
        number,
        normalizeSuffix = '',
    } = formattedNormalize(value, Lang.en);

    return `${number.toPrecision(3)} ${normalizeSuffix}`;
}

export const basicEntityKeySelector = (d: BasicEntity): string => d.id;
export const basicEntityLabelSelector = (d: BasicEntity) => d.name;

export const enumKeySelector = <T extends string | number>(d: EnumEntity<T>) => d.name;
export const enumLabelSelector = (d: EnumEntity<string>) => d.description ?? d.name;

const rege = /(?<=\/\/)localhost(?=[:/]|$)/;

export function isLocalUrl(url: string) {
    return rege.test(url);
}

export function isValidUrl(url: string | undefined): url is string {
    if (!url) {
        return false;
    }
    const sanitizedUrl = url.replace(rege, 'localhost.com');
    return isValidRemoteUrl(sanitizedUrl);
}

export interface MultiResponse<T> {
    limit: number;
    total: number;
    results: T[];
}

export function add(args: (number | undefined)[]) {
    const newArgs = args.filter(isDefined);
    return sum(newArgs);
}
