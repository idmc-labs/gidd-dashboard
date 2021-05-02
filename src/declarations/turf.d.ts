declare module '@turf/combine' {
    // import * as React from 'react';

    // eslint-disable-next-line import/prefer-default-export
    export default function combine<P>(
        featureCollection: GeoJSON.FeatureCollection<
            GeoJSON.Point | GeoJSON.Line | GeoJSON.Polygon,
            P
        >
    ): GeoJSON.FeatureCollection<
        GeoJSON.MultiPoint | GeoJSON.MultiLine | GeoJSON.MultiPolygon,
        P
    >;
}

declare module 'turf-featurecollection' {
    // import * as React from 'react';

    // eslint-disable-next-line import/prefer-default-export
    export default function featureCollection<T, P>(
        features: GeoJSON.Feature<T, P>[],
    ): GeoJSON.FeatureCollection<T, P>;
}
