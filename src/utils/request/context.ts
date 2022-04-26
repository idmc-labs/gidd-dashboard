import { createContext } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-types
export type RequestOption = Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined };

export interface ContextInterface {
    transformUrl: (url: string) => string;
    transformOptions: (
        url: string,
        options: RequestOption,
    ) => RequestInit;
}

const defaultContext: ContextInterface = {
    transformUrl: (url) => url,
    transformOptions: (_, { body, ...otherOptions }) => ({
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
        ...otherOptions,
    }),
};

const RequestContext = createContext(defaultContext);
export default RequestContext;
