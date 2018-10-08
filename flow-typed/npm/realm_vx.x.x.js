// flow-typed signature: e117a20e9a4ff3244142097719671266
// flow-typed version: <<STUB>>/realm_v2.16.1/flow_v0.81.0

declare class RealmObjectsList implements Iterator<RealmObject> {
    length: number;
    filtered (query: string, arg: ?any): RealmObjectsList;
    snapshot (): RealmObjectsList;
    sorted (descriptor: any, reverse: ?boolean): RealmObjectsList;
    [id: number]: RealmObject;
    @@iterator (): Iterator<RealmObject>;
    map (func: Function): Array<any>;
}

declare class RealmList {
    length: number;
    filtered (query: string, arg: ?any): RealmObjectsList;
    pop (): Object | typeof undefined;
    push (...object: any): number;
    shift (): Object | typeof undefined;
    snapshot (): RealmObjectsList;
    sorted (descriptor: any, reverse: ?boolean): RealmObjectsList;
    unshift (...object: any): number;
}

declare type RealmSchemaProperty = {
    type: string;
    objectType: ?string;
    default: ?any;
    optional: ?boolean;
}

declare type RealmSchema = {
    name: string;
    primaryKey: ?string;
    properties: any;
}

declare type RealmConfiguration = {
    path: ?string;
    schema: ?RealmSchema;
    schemaVersion: ?number;
}

declare type RealmObject = Object

declare class RealmInstance {
    defaultPath: string;
    constructor (config: ?RealmConfiguration): void;
    addListener (name: string, callback: () => void): void;
    create (type: string, properties: Object, update: ?boolean): RealmObject;
    delete (object: Object | Array<Object> | RealmList | RealmObjectsList): void;
    deleteAll (): void;
    objects (type: string): RealmObjectsList;
    removeAllListeners (name: ?string): void;
    write (callback: () => void): void;
}
