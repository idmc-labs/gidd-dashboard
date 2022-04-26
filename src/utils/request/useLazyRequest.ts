import {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    useContext,
    useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';

import AbortController from 'abort-controller';

import { prepareUrlParams, isFetchable, Methods } from './utils';
import {
    UrlParams,
    Error,
} from './types';
import RequestContext from './context';
import fetchResource, { RequestOptions as NonTriggerFetchOptions } from './fetch';

// NOTE: when context is undefined, the request will not trigger
// If there is no context, user should instead use null

type Callable<Q, T> = T | ((value: Q) => T);

function isCallable<Q, T>(value: Callable<Q, T>): value is ((value: Q) => T) {
    return typeof value === 'function';
}

function resolveCallable<Q, T>(value: Callable<Q, T>, context: Q | undefined) {
    if (isCallable(value)) {
        return context !== undefined ? value(context) : undefined;
    }
    return value;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type RequestBody = RequestInit['body'] | object;

interface LazyRequestOptions<T, Q> extends NonTriggerFetchOptions<T, Q> {
    url: Callable<Q, string | undefined>;
    query?: Callable<Q, UrlParams | undefined>;
    body?: Callable<Q, RequestBody | undefined>;
    method?: Callable<Q, Methods | undefined>;
    other?: Callable<Q, Omit<RequestInit, 'body'> | undefined>;

    // NOTE: don't ever re-trigger
    delay?: number;
    mockResponse?: T;
    preserveResponse?: boolean;
}

function useLazyRequest<T, Q = null>(
    requestOptions: LazyRequestOptions<T, Q>,
) {
    const {
        transformOptions,
        transformUrl,
    } = useContext(RequestContext);

    // NOTE: forgot why the clientId is required but it is required
    const clientIdRef = useRef<number>(-1);
    const pendingSetByRef = useRef<number>(-1);
    const responseSetByRef = useRef<number>(-1);
    const errorSetByRef = useRef<number>(-1);

    const [requestOptionsFromState, setRequestOptionsFromState] = useState(requestOptions);
    const [context, setContext] = useState<Q | undefined>();

    // NOTE: let's not add transformOptions as dependency
    const requestOptionsRef = useRef(requestOptions);
    const transformOptionsRef = useRef(transformOptions);
    const transformUrlRef = useRef(transformUrl);
    const contextRef = useRef(context);

    const {
        url: rawUrl,
        query: rawQuery,
        method: rawMethod,
        body: rawBody,
        other: rawOther,
    } = requestOptionsFromState;

    const query = useMemo(
        () => resolveCallable(rawQuery, context),
        [rawQuery, context],
    );
    const url = useMemo(
        () => resolveCallable(rawUrl, context),
        [rawUrl, context],
    );
    const body = useMemo(
        () => resolveCallable(rawBody, context),
        [rawBody, context],
    );
    const method = useMemo(
        () => resolveCallable(rawMethod, context) ?? 'GET',
        [rawMethod, context],
    );
    const other = useMemo(
        () => resolveCallable(rawOther, context),
        [rawOther, context],
    );

    const urlQuery = query ? prepareUrlParams(query) : undefined;
    const extendedUrl = url && urlQuery ? `${url}?${urlQuery}` : url;

    const [response, setResponse] = useState<T | undefined>();
    const [error, setError] = useState<Error | undefined>();

    const [runId, setRunId] = useState(-1);

    const [pending, setPending] = useState(false);

    const setPendingSafe = useCallback(
        (value: boolean, clientId: number) => {
            if (clientId >= pendingSetByRef.current) {
                pendingSetByRef.current = clientId;
                setPending(value);
            }
        },
        [],
    );
    const setResponseSafe = useCallback(
        (value: T | undefined, clientId: number) => {
            if (clientId >= responseSetByRef.current) {
                responseSetByRef.current = clientId;
                setResponse(value);
            }
        },
        [],
    );

    const setErrorSafe = useCallback(
        (value: Error | undefined, clientId: number) => {
            if (clientId >= errorSetByRef.current) {
                errorSetByRef.current = clientId;
                setError(value);
            }
        },
        [],
    );

    const callSideEffectSafe = useCallback(
        (callback: () => void, clientId: number) => {
            if (clientId >= clientIdRef.current) {
                callback();
            }
        },
        [],
    );

    useLayoutEffect(
        () => {
            transformOptionsRef.current = transformOptions;
        },
        [transformOptions],
    );
    useLayoutEffect(
        () => {
            transformUrlRef.current = transformUrl;
        },
        [transformUrl],
    );
    useLayoutEffect(
        () => {
            requestOptionsRef.current = requestOptions;
        },
        [requestOptions],
    );
    useLayoutEffect(
        () => {
            contextRef.current = context;
        },
        [context],
    );

    useEffect(
        () => {
            const { mockResponse } = requestOptionsRef.current;
            if (mockResponse) {
                if (context === undefined || runId < 0 || !isFetchable(extendedUrl, method, body)) {
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    return () => {};
                }

                clientIdRef.current += 1;

                setResponseSafe(mockResponse, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
                setPendingSafe(false, clientIdRef.current);

                const { onSuccess } = requestOptionsRef.current;
                if (onSuccess) {
                    callSideEffectSafe(() => {
                        onSuccess(mockResponse, context);
                    }, clientIdRef.current);
                }
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                return () => {};
            }

            if (context === undefined || runId < 0 || !isFetchable(extendedUrl, method, body)) {
                setResponseSafe(undefined, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
                setPendingSafe(false, clientIdRef.current);
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                return () => {};
            }

            const {
                preserveResponse,
                delay = 0,
            } = requestOptionsRef.current;

            if (!preserveResponse) {
                setResponseSafe(undefined, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
            }

            clientIdRef.current += 1;

            setPendingSafe(true, clientIdRef.current);

            const controller = new AbortController();

            fetchResource(
                extendedUrl,
                {
                    ...other,
                    method,
                    // FIXME: here object is explicitly cast as BodyInit
                    body: body as (BodyInit | null | undefined),
                },
                delay,

                transformUrlRef,
                transformOptionsRef,
                requestOptionsRef,
                context,

                setPendingSafe,
                setResponseSafe,
                setErrorSafe,
                callSideEffectSafe,

                controller,
                clientIdRef.current,
            );

            return () => {
                controller.abort();
            };
        },
        [
            context,
            extendedUrl, method, body, other,
            setPendingSafe, setResponseSafe, setErrorSafe, callSideEffectSafe,
            runId,
        ],
    );

    const trigger = useCallback(
        (ctx: Q) => {
            ReactDOM.unstable_batchedUpdates(() => {
                setRunId(new Date().getTime());
                setContext(ctx);
                setRequestOptionsFromState(requestOptionsRef.current);
            });
        },
        [],
    );

    return {
        response,
        pending,
        error: error?.value,
        trigger,
        context,
    };
}
export default useLazyRequest;
