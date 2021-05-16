import {
    isValidUrl as isValidRemoteUrl,
    isDefined,
    sum,
    listToMap,
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

export const regions = [
    {
        key: 'East Asia and Pacific',
        value: 'East Asia and Pacific',
        countries: ['CXR', 'TKL', 'NFK', 'NIU', 'WLF', 'PCN', 'HMD', 'UMI', 'CCK', 'ASM', 'AUS', 'BRN', 'KHM', 'COK', 'CHN', 'FJI', 'PYF', 'GUM', 'HKG', 'IDN', 'JPN', 'KIR', 'PRK', 'LAO', 'MYS', 'MHL', 'FSM', 'MAC', 'MNG', 'MMR', 'NCL', 'NZL', 'MNP', 'PLW', 'PNG', 'PHL', 'WSM', 'KOR', 'NRU', 'SGP', 'SLB', 'TWN', 'THA', 'TLS', 'TON', 'TUV', 'VUT', 'VNM'],
    },
    {
        key: 'Europe & Central Asia',
        value: 'Europe & Central Asia',
        countries: ['VAT', 'SJM', 'GIB', 'SRK', 'ALA', 'JEY', 'GGY'],
    },
    {
        key: 'Sub-Saharan Africa',
        value: 'Sub-Saharan Africa',
        countries: ['SHN', 'MYT', 'REU', 'BEN', 'TZA', 'AB9', 'AGO', 'BWA', 'TCD', 'GNQ', 'CIV', 'GMB', 'GIN', 'MWI', 'ATF', 'IOT', 'BFA', 'ERI', 'ETH', 'COM', 'COG', 'CPV', 'CAF', 'GNB', 'KEN', 'GHA', 'LBR', 'MLI', 'MDG', 'MOZ', 'LSO', 'NAM', 'MRT', 'MUS', 'SEN', 'RWA', 'SYC', 'NGA', 'SLE', 'ZAF', 'TGO', 'SOM', 'UGA', 'SWZ', 'CMR', 'COD', 'GAB', 'BDI', 'NER', 'SDN', 'STP', 'ZWE', 'SSD', 'ZMB'],
    },
    {
        key: 'Antarctica',
        value: 'Antarctica',
        countries: ['ATA'],
    },
    {
        key: 'South Asia',
        value: 'South Asia',
        countries: ['AFG', 'BGD', 'BTN', 'IND', 'MDV', 'NPL', 'PAK', 'LKA'],
    },
    {
        key: 'Europe and Central Asia',
        value: 'Europe and Central Asia',
        countries: ['ALB', 'AND', 'ARM', 'AUT', 'AZE', 'BLR', 'BEL', 'BIH', 'XKX', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FRO', 'FIN', 'FRA', 'GEO', 'DEU', 'GRC', 'GRL', 'HUN', 'ISL', 'IRL', 'IMN', 'ITA', 'KAZ', 'KGZ', 'LVA', 'LIE', 'LTU', 'LUX', 'MKD', 'MDA', 'MCO', 'MNE', 'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'RUS', 'SMR', 'SRB', 'SVK', 'SVN', 'ESP', 'SWE', 'CHE', 'TJK', 'TUR', 'TKM', 'UKR', 'UZB', 'GBR'],
    },
    {
        key: 'Middle East and North Africa',
        value: 'Middle East and North Africa',
        countries: ['BHR', 'ESH', 'IRQ', 'ISR', 'JOR', 'KWT', 'LBN', 'MLT', 'OMN', 'PSE', 'QAT', 'SAU', 'IRN', 'DJI', 'MAR', 'SYR', 'ARE', 'YEM', 'TUN', 'LBY', 'EGY', 'DZA'],
    },
    {
        key: 'North America',
        value: 'North America',
        countries: ['BMU', 'CAN', 'USA'],
    },
    {
        key: 'Latin America and the Caribbean',
        value: 'Latin America and the Caribbean',
        countries: ['CHL', 'GUF', 'MTQ', 'GLP', 'SPM', 'SGS', 'BES', 'MSR', 'BLM', 'FLK', 'BVT', 'ABW', 'ATG', 'ARG', 'BHS', 'BRB', 'BLZ', 'BRA', 'CYM', 'COL', 'CRI', 'CUB', 'CUW', 'DMA', 'BOL', 'DOM', 'ECU', 'SLV', 'GRD', 'GTM', 'GUY', 'HTI', 'HND', 'JAM', 'MEX', 'NIC', 'PAN', 'PRY', 'PER', 'PRI', 'KNA', 'LCA', 'VCT', 'MAF', 'TTO', 'TCA', 'SXM', 'URY', 'VIR', 'AIA', 'VGB', 'VEN', 'SUR'],
    },
];

export const regionMap = listToMap(regions, (d) => d.key, (d) => d.countries);
