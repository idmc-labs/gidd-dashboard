import { isDefined, isNotDefined, isTruthyString } from '@togglecorp/fujs';

import { UrlParams } from './types';
import type { RequestOption } from './context';

// eslint-disable-next-line import/prefer-default-export
export function prepareUrlParams(params: UrlParams): string {
    return Object.keys(params)
        .filter((k) => isDefined(params[k]))
        .map((k) => {
            const param = params[k];
            if (isNotDefined(param)) {
                return undefined;
            }
            let val: string;
            if (Array.isArray(param)) {
                val = param.join(',');
            } else if (typeof param === 'number' || typeof param === 'boolean') {
                val = String(param);
            } else {
                val = param;
            }
            return `${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
        })
        .filter(isDefined)
        .join('&');
}

export function processOptions(options: RequestOption) {
    const {
        body,
        headers,
        ...otherOptions
    } = options;

    return {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...otherOptions,
    };
}

export type Methods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export function isFetchable(
    url: string | undefined,
    method: Methods,
    // eslint-disable-next-line @typescript-eslint/ban-types
    body: RequestInit['body'] | object | undefined,
): url is string {
    return (
        isTruthyString(url)
        && (!['PUT', 'PATCH', 'POST'].includes(method) || isDefined(body))
    );
}
