import React from 'react';
import ReactDOM from 'react-dom';

import Root from './Root';

console.info('React version', React.version);

const rootElement = document.getElementById('gidd-dashboard-client-root');
if (rootElement) {
    ReactDOM.unstable_createRoot(rootElement).render(<Root />);
} else {
    console.error('Root element was not found');
}
