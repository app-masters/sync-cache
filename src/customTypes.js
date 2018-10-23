// Storage expected methods
declare interface Storage {
    setup (schemas: Array<Object>): any;
    createItem (key: string, value: Object): Object;
    updateItem (key: string, value: Object): Object;
    deleteItem (item: RealmObject): Promise<void>;
    getItems (key: string, filter: Object | string): Promise<Array<Object> | null>;
    removeAll (key: string): Promise<void>;
    convertFilter (filter: Object | string): string;
    checkSchema (key: string): void;
    getAllKeys (): Promise<Array<string>>;
    getModel (): any;
}

// Default expected config for synchronization class (AMActions replication)
declare type SyncConfig = {
    name: string, // required
    validateObject (item: Object): Object, // required
    prepareToServer (item: Object): Object,
    prepareToClient (item: Object): Object,
    conflictRule (cacheObject: CacheObject, onlineObject: OnlineObject): Object,
    typePrefix: string, // required
    endPoint: string, // required
    cacheStrategy: ?string,
    createSuffix: ?string,
    updateSuffix: ?string,
    deleteSuffix: ?string,
    primaryKey: ?string,
    foreignKeys: ?Array<string>,
    relations: ?Array<{table: string, field: string}>
}

// Incoming object from API
declare type OnlineObject = {
    [any]: any,
    _id?: number | string,
    id?: number | string,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
}

// Incoming object from AMSyncCache
declare type CacheObject = {
    [any]: any,
    _cacheId: number,
    _cacheCreatedAt: Date | null,
    _cacheUpdatedAt: Date | null,
    _cacheDeletedAt: Date | null
}

// Redux thunk actions and dispatch
declare type Action = { type: string, payload: any, [any]: any };
declare type Dispatch = (action: Action) => void;

export type Storage = Storage;
export type SyncConfig = SyncConfig;
export type Action = Action;
export type Dispatch = Dispatch;
export type OnlineObject = OnlineObject;
export type CacheObject = CacheObject;