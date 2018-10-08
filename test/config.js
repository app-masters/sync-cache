// Simple user schema
const userCacheSchema = {
    name: 'USER',
    primaryKey: '_cacheId',
    properties: {
        _id: 'int?',
        name: 'string?',
        localEmail: 'string?',
        localPassword: 'string?',
        role: 'string?',
        createdAt: 'date?',
        updatedAt: 'date?',
        deletedAt: 'date?',

        _cacheCreatedAt: 'date?',
        _cacheUpdatedAt: 'date?',
        _cacheDeletedAt: 'date?',
        _cacheId: {type: 'int', indexed: true}
    }
};

// Priories newest object
const conflictRule = (cacheObject, onlineObject) => {
    const dateCache = new Date(cacheObject.updatedAt).getDate();
    const dateOnline = new Date(onlineObject.updatedAt).getDate();
    if (dateCache < dateOnline) {
        return onlineObject;
    } else {
        return cacheObject;
    }
};

// Default config for USER actions
const userReduxConfig = {
    validateObject: () => {
    }, // required
    prepareToServer: (item) => item,
    prepareToClient: (item) => item,
    conflictRule: conflictRule,
    typePrefix: 'USER', // required
    endPoint: '/users', // required
    cacheStrategy: 'CacheOnline',
    createSuffix: '',
    updateSuffix: '',
    deleteSuffix: '',
    primaryKey: '_id'
};

export { userReduxConfig, userCacheSchema };