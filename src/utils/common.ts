import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import combine from '@turf/combine';
import featureCollection from 'turf-featurecollection';
import { isValidUrl as isValidRemoteUrl } from '@togglecorp/fujs';
import {
    BasicEntity,
    EnumEntity,
} from '#types';

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

export function listToMap<T, K extends string | number, V>(
    items: T[],
    keySelector: (val: T, index: number) => K,
    valueSelector: (val: T, index: number) => V,
) {
    const val: Partial<Record<K, V>> = items.reduce(
        (acc, item, index) => {
            const key = keySelector(item, index);
            const value = valueSelector(item, index);
            return {
                ...acc,
                [key]: value,
            };
        },
        {},
    );
    return val;
}

type Bounds = [number, number, number, number];
export function mergeBbox(bboxes: GeoJSON.BBox[]) {
    const boundsFeatures = bboxes.map((b) => bboxPolygon(b));
    const boundsFeatureCollection = featureCollection(boundsFeatures);
    const combinedPolygons = combine(boundsFeatureCollection);
    const maxBounds = bbox(combinedPolygons);
    return maxBounds as Bounds;
}
