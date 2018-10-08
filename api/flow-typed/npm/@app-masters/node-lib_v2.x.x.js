declare class AMNL$ModelSequelize {
    constructor (): this;
}
declare class AMLN$Instance {
    constructor (obj: ?Object, repo: Object): this;
    spreadProperties (obj: Object): void;
    save (): Promise<void>;
    delete (): Promise<void>;
    getPropertiesById (): Promise<void>;
}

declare class AMNL$Repository<Instance> {
    static setup (sequelize: Object, modelName: string, schema: ?Object, itemInstance: Instance, modelOptions: Object): void;
    static getModel (): Object;
    static getInstance (): Instance;
    static create (obj: Object): Promise<boolean>;
    static save (obj: Object): Promise<Instance>;
    static findById (where: number | String, include: ?(string | Array<Object>), order: ?string, limit: ?number, attr: ?(Array<any> | Object)): Promise<Instance>;
    static findByIdCache (where: Object, include: ?(string | Array<Object>), order: ?string, limit: ?number, attr: ?(Array<any> | Object)): Promise<Instance>;
    static find (query: Object, include: ?(string | Array<Object>), order: ?string, limit: ?number, attr: ?(Array<any> | Object)): Promise<Array<Instance>>;
    static findCache (query: Object, include: ?(string | Array<Object>), order: ?string, limit: ?number, attr: ?(Array<any> | Object)): Promise<Array<Instance>>;
    static findOne (query: Object, include: ?(string | Array<Object>), order: ?string, limit: ?number, attr: ?(Array<any> | Object)): Promise<Instance>;
    static queryOne(sql: string): Promise<any>;
    static query(sql: string): Promise<Array<any>>;
    static update (where: Object, obj: Object): boolean;
    static delete (where: Object): Promise<boolean>;
    static updateOne (where: Object, obj: Object): Promise<Instance>;
}

declare module '@app-masters/node-lib' {
    declare export type ModelSequelize = AMNL$ModelSequelize;
    declare export type Repository<Instance> = AMNL$Repository<Instance>;
    declare export type Instance = AMLN$Instance;
    declare module.exports: {
    amAuth: any,
    amBootstreap: any,
    amController: any,
    amError:any,
    amInvite: any,
    amLeadManager: any,
    amMailing: any,
    amModel: any,
    amRdStation: any,
    amRouter: any,
    amSoftDelete: any,
    amSystem:any,
    checkVersion: any,
    dateTime: any,
    util: any,
    apiBootstrap: any,
    nodeRestful: any,
    stats: any,
    message: any,
    messageSequelize: any,
    notification: any,
    auth: any,
    modelSequelize: typeof AMNL$ModelSequelize,
    modelMongoose: any,
    jsonSchema: any,
    apiBootstrapS: any,
    express: any,
    finaleRestfull: any,
    repository: typeof AMNL$Repository,
    instance: typeof AMLN$Instance
    }
}
