export interface ListEntity {
    uuid: string;
}

export interface EnumEntity<T extends string | number> {
    name: T;
    description?: string | null;
}

export interface BasicEntity {
    id: string;
    name: string;
}
