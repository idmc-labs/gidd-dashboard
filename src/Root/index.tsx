import React from 'react';
import { init, ErrorBoundary } from '@sentry/react';
import 'requestidlecallback-polyfill';

import Error from '#views/Error';
import App from './App';

import styles from './styles.css';

const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
const appCommitHash = process.env.REACT_APP_COMMITHASH;
const runtimeEnv = process.env.NODE_ENV;
const env = process.env.REACT_APP_ENV;
if (sentryDsn && runtimeEnv === 'production') {
    init({
        dsn: sentryDsn,
        release: `helix@${appCommitHash}`,
        environment: env,
        // sendDefaultPii: true,
        normalizeDepth: 5,
    });
}

interface Props {
}

function Root(props: Props) {
    return (
        <ErrorBoundary
            fallback={<Error className={styles.error} />}
            showDialog
        >
            <App {...props} />
        </ErrorBoundary>
    );
}

export default Root;
