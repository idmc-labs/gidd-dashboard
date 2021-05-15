import {
    _cs,
    compareString,
    compareNumber,
} from '@togglecorp/fujs';
import {
    Numeral,
    NumeralProps,
    TableHeaderCell,
    TableHeaderCellProps,
    TableColumn,
    TableSortDirection,
    TableFilterType,
} from '@togglecorp/toggle-ui';

import ExternalLink, { ExternalLinkProps } from './ExternalLink';
import Status, { StatusProps } from './Status';
import Text, { TextProps } from './Text';

import styles from './styles.css';

export function createExternalLinkColumn<D, K>(
    id: string,
    title: string,
    accessor: (item: D) => {
        title: string | undefined | null,
        link: string | undefined | null,
    } | undefined | null,
    options?: {
        cellAsHeader?: boolean,
        sortable?: boolean,
        defaultSortDirection?: TableSortDirection,
        filterType?: TableFilterType,
        orderable?: boolean;
        hideable?: boolean;
    },
) {
    const item: TableColumn<D, K, ExternalLinkProps, TableHeaderCellProps> & {
        valueSelector: (item: D) => string | undefined | null,
        valueComparator: (foo: D, bar: D) => number,
    } = {
        id,
        title,
        cellAsHeader: options?.cellAsHeader,
        headerCellRenderer: TableHeaderCell,
        headerCellRendererParams: {
            sortable: options?.sortable,
            filterType: options?.filterType,
            orderable: options?.orderable,
            hideable: options?.hideable,
        },
        cellRenderer: ExternalLink,
        cellRendererParams: (_: K, datum: D): ExternalLinkProps => {
            const value = accessor(datum);
            return {
                title: value?.title,
                link: value?.link,
            };
        },
        valueSelector: (it) => accessor(it)?.title,
        valueComparator: (foo: D, bar: D) => compareString(
            accessor(foo)?.title,
            accessor(bar)?.title,
        ),
    };
    return item;
}

export function createTextColumn<D, K>(
    id: string,
    title: string,
    accessor: (item: D) => string | undefined | null,
    options?: {
        cellAsHeader?: boolean,
        sortable?: boolean,
        defaultSortDirection?: TableSortDirection,
        filterType?: TableFilterType,
        orderable?: boolean;
        hideable?: boolean;
    },
) {
    const item: TableColumn<D, K, TextProps, TableHeaderCellProps> & {
        valueSelector: (item: D) => string | undefined | null,
        valueComparator: (foo: D, bar: D) => number,
    } = {
        id,
        title,
        cellAsHeader: options?.cellAsHeader,
        headerCellRenderer: TableHeaderCell,
        headerCellRendererParams: {
            sortable: options?.sortable,
            filterType: options?.filterType,
            orderable: options?.orderable,
            hideable: options?.hideable,
        },
        cellRenderer: Text,
        cellRendererParams: (_: K, datum: D): TextProps => ({
            value: accessor(datum),
        }),
        valueSelector: accessor,
        valueComparator: (foo: D, bar: D) => compareString(accessor(foo), accessor(bar)),
    };
    return item;
}

export function createStatusColumn<D, K>(
    id: string,
    title: string,
    accessor: (item: D) => {
        isReviewed: boolean | undefined | null,
        isSignedOff: boolean | undefined | null,
        isUnderReview: boolean | undefined | null,
    } | undefined | null,
    options?: {
        cellAsHeader?: boolean,
        sortable?: boolean,
        defaultSortDirection?: TableSortDirection,
        filterType?: TableFilterType,
        orderable?: boolean;
        hideable?: boolean;
    },
) {
    const item: TableColumn<D, K, StatusProps, TableHeaderCellProps> = {
        id,
        title,
        cellAsHeader: options?.cellAsHeader,
        headerCellRenderer: TableHeaderCell,
        headerCellRendererParams: {
            sortable: options?.sortable,
            filterType: options?.filterType,
            orderable: options?.orderable,
            hideable: options?.hideable,
        },
        cellRenderer: Status,
        cellRendererParams: (_: K, datum: D): StatusProps => {
            const value = accessor(datum);
            return {
                isReviewed: value?.isReviewed,
                isSignedOff: value?.isSignedOff,
                isUnderReview: value?.isUnderReview,
            };
        },
    };
    return item;
}

export function createNumberColumn<D, K>(
    id: string,
    title: string,
    accessor: (item: D) => number | undefined | null,
    options?: {
        cellAsHeader?: boolean,
        sortable?: boolean,
        defaultSortDirection?: TableSortDirection,
        filterType?: TableFilterType,
        orderable?: boolean;
        hideable?: boolean;
        variant?: 'conflict' | 'disaster';
        separator?: string;
        placeholder?: string;
    },
) {
    const item: TableColumn<D, K, NumeralProps, TableHeaderCellProps> & {
        valueSelector: (item: D) => number | undefined | null,
        valueComparator: (foo: D, bar: D) => number,
    } = {
        id,
        title,
        cellAsHeader: options?.cellAsHeader,
        headerCellRenderer: TableHeaderCell,
        headerCellRendererParams: {
            sortable: options?.sortable,
            filterType: options?.filterType,
            orderable: options?.orderable,
            hideable: options?.hideable,
        },
        cellRenderer: Numeral,
        headerCellRendererClassName: _cs(
            styles.header,
            styles[options?.variant],
        ),
        cellRendererClassName: styles.number,
        cellRendererParams: (_: K, datum: D): NumeralProps => ({
            value: accessor(datum),
            placeholder: options?.placeholder ?? '0',
            separator: options?.separator ?? ',',
        }),
        valueSelector: accessor,
        valueComparator: (foo: D, bar: D) => compareNumber(accessor(foo), accessor(bar)),
    };
    return item;
}
