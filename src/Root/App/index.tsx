import React, { useMemo } from 'react';

import {
    RequestContext,
} from '#utils/request';
import { RequestOption } from '#utils/request/context';
import { processOptions } from '#utils/request/utils';

import '@togglecorp/toggle-ui/build/index.css';
import '../../../node_modules/mapbox-gl/dist/mapbox-gl.css';
import './styles.css';

import Gidd from '../../views/Gidd';

function App() {
    const requestContextValue = useMemo(() => ({
        transformUrl: (d: string) => d,
        transformOptions: (_: string, options: RequestOption) => processOptions(options),
    }), []);

    return (
        <RequestContext.Provider value={requestContextValue}>
            <Gidd />
        </RequestContext.Provider>
    );
}
export default App;
