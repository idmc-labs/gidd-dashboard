import ReactDOM from 'react-dom';
import AbortController from 'abort-controller';

import sleep from './sleep';
import { Error, Err } from './types';
import { ContextInterface } from './context';

export interface RequestOptions<T, Q> {
    shouldRetry?: (val: T, run: number, context: Q) => number;
    shouldPoll?: (val: T | undefined, context: Q) => number;
    onSuccess?: (val: T, context: Q) => void;
    onFailure?: (val: Err, context: Q) => void;
    // delay?: number;
    // preserveResponse?: boolean;
}

async function fetchResource<T, Q>(
    url: string,
    options: RequestInit,
    delay: number,

    transformUrlRef: React.MutableRefObject<ContextInterface['transformUrl']>,
    transformOptionsRef: React.MutableRefObject<ContextInterface['transformOptions']>,
    requestOptionsRef: React.MutableRefObject<RequestOptions<T, Q>>,
    context: Q,

    setPendingSafe: (value: boolean, clientId: number) => void,
    setResponseSafe: (value: T | undefined, clientId: number) => void,
    setErrorSafe: (value: Error | undefined, clientId: number) => void,
    callSideEffectSafe: (value: () => void, clientId: number) => void,

    myController: AbortController,
    clientId: number,
    run = 1,
) {
    const { signal } = myController;
    await sleep(delay, { signal });

    async function handlePoll(pollTime: number) {
        await sleep(pollTime, { signal });

        await fetchResource(
            url,
            options,
            delay,

            transformUrlRef,
            transformOptionsRef,
            requestOptionsRef,
            context,

            setPendingSafe,
            setResponseSafe,
            setErrorSafe,
            callSideEffectSafe,

            myController,
            clientId, // NOTE: may not need to increase clientId
            1, // NOTE: run should be reset
        );
    }

    async function handleError(message: Error) {
        const { shouldPoll } = requestOptionsRef.current;
        const pollTime = shouldPoll ? shouldPoll(undefined, context) : -1;

        if (pollTime > 0) {
            await handlePoll(pollTime);
        } else {
            ReactDOM.unstable_batchedUpdates(() => {
                setPendingSafe(false, clientId);
                setResponseSafe(undefined, clientId);
                setErrorSafe(message, clientId);
            });
            const { onFailure } = requestOptionsRef.current;
            if (onFailure) {
                callSideEffectSafe(() => {
                    console.error(message.value);
                    onFailure(message.value, context);
                }, clientId);
            }
        }
    }

    const myUrl = transformUrlRef.current(url);
    const myOptions = transformOptionsRef.current(url, options);

    let res;
    try {
        res = await fetch(myUrl, { ...myOptions, signal });
    } catch (e) {
        if (!signal.aborted) {
            console.error(`An error occurred while fetching ${myUrl}`, e);

            const message = {
                reason: 'network',
                exception: e,
                value: { nonFieldErrors: ['Network error'] },
            };
            await handleError(message);
        }
        return;
    }

    let resBody: unknown;
    try {
        const resText = await res.text();
        if (resText.length > 0) {
            resBody = JSON.parse(resText);
        }
    } catch (e) {
        const message = {
            reason: 'parse',
            exception: e,
            value: { nonFieldErrors: ['JSON parse error'] },
        };
        await handleError(message);
        return;
    }

    if (!res.ok) {
        const message = {
            reason: 'other',
            exception: undefined,
            value: (resBody as { errors: Err }).errors,
            errorCode: (resBody as { errors: Err; errorCode: number }).errorCode,
        };
        await handleError(message);
        return;
    }

    const { shouldRetry, shouldPoll } = requestOptionsRef.current;

    const retryTime = shouldRetry ? shouldRetry(resBody as T, run, context) : -1;

    if (retryTime >= 0) {
        await sleep(retryTime, { signal });
        await fetchResource(
            url,
            options,
            delay,

            transformUrlRef,
            transformOptionsRef,
            requestOptionsRef,
            context,

            setPendingSafe,
            setResponseSafe,
            setErrorSafe,
            callSideEffectSafe,

            myController,
            clientId,
            run + 1,
        );
        return;
    }

    const pollTime = shouldPoll ? shouldPoll(resBody as T, context) : -1;
    ReactDOM.unstable_batchedUpdates(() => {
        if (pollTime < 0) {
            setPendingSafe(false, clientId);
        }
        setErrorSafe(undefined, clientId);
        setResponseSafe(resBody as T, clientId);
    });

    const { onSuccess } = requestOptionsRef.current;
    if (onSuccess) {
        callSideEffectSafe(() => {
            onSuccess(resBody as T, context);
        }, clientId);
    }

    if (pollTime >= 0) {
        await handlePoll(pollTime);
    }
}

export default fetchResource;
