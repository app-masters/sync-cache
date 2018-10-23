// @flow
import AMCache from './amSyncCache';
import { Http } from '@app-masters/js-lib';
import type { SyncConfig, Dispatch, Action, OnlineObject, CacheObject } from './customTypes';

class AMSync {
    // Static callbacks
    static errorCallback: (error: Error) => void; // Custom error handler
    static connectionFailCallback: (error: Error) => void; // Custom internet fail handler

    // Attributes of AMSync Class
    config: SyncConfig; // Config Object

    /**
     * On new instance, check if the config have the required params and set config attribute
     * @param config
     */
    constructor (config: SyncConfig) {
        // Verify validateObject on incoming config
        if (!config.validateObject || (typeof config.validateObject) !== 'function') {
            throw new Error('Every actions must have a validateObject function on config');
        }

        // Verify typePrefix and endPoint on incoming config
        if (!config.typePrefix || !config.endPoint) {
            throw new Error('You must set your config! Please set at least: typePrefix, endPoint, indexKey');
        }

        // Set cacheStrategy as 'CacheOnline' if none is defined
        if (!config.cacheStrategy || ['CacheOnline', 'CacheEmptyOnline', 'Cache', 'Online'].indexOf(config.cacheStrategy) < 0) {
            config.cacheStrategy = 'CacheOnline';
        }

        // Set desired primaryKey used by external database
        if (config.primaryKey) {
            AMCache.setPrimaryKey(config.primaryKey);
        } else {
            // If no primaryKey is defined, use the cache default
            config.primaryKey = AMCache.primaryKey;
        }

        // Bind everything!
        this.createObject = this.createObject.bind(this);
        this.updateObject = this.updateObject.bind(this);
        this.deleteObject = this.deleteObject.bind(this);
        this.setError = this.setError.bind(this);
        this.setLoading = this.setLoading.bind(this);
        this.getObjectsToCreate =  this.getObjectsToCreate.bind(this);
        this.getObjectsToUpdate =  this.getObjectsToUpdate.bind(this);
        this.getObjectsToDelete =  this.getObjectsToDelete.bind(this);
        this.syncCreatedObjects =  this.syncCreatedObjects.bind(this);
        this.syncUpdatedObjects =  this.syncUpdatedObjects.bind(this);
        this.syncDeletedObjects =  this.syncDeletedObjects.bind(this);

        // Save it here
        this.config = config;
    }

    // ------------------------- AMACTIONS METHODS -------------------------

    /**
     * Define a object with the callback for each cache actions
     * @param action - CREATE, UPDATE or DELETE
     * @returns {Object}
     */
    actionMethods (action: string): Object {
        switch (action) {
        case 'CREATE':
            return {
                cacheMethod: AMCache.createObject,
                onlineMethod: this.createOnline.bind(this),
                reduxMethod: (dispatch, object) => {
                    this.setCreateObject(dispatch, object);
                    this.setSaveObject(dispatch, object);
                },
                syncMethod: this.setObjectCreated.bind(this)
            };
        case 'UPDATE':
            return {
                cacheMethod: AMCache.updateObject,
                onlineMethod: this.updateOnline.bind(this),
                reduxMethod: (dispatch, object) => {
                    this.setUpdateObject(dispatch, object);
                    this.setSaveObject(dispatch, object);
                },
                syncMethod: this.setObjectUpdated.bind(this)
            };
        case 'DELETE':
            return {
                cacheMethod: AMCache.deleteObject,
                onlineMethod: this.deleteOnline.bind(this),
                reduxMethod: this.setDeleteObject.bind(this),
                syncMethod: this.setObjectDeleted.bind(this)
            };
        default:
            throw new Error('Invalid actions provided to actionMethods: ' + action);
        }
    }

    /**
     * Redux thunk actions for create object
     * @param object
     * @returns {Function}
     */
    createObject (object: Object): (dispatch: Dispatch) => Promise<void> {
        return this.getActionOfObject('CREATE', object);
    }

    /**
     * Redux thunk actions for update object
     * @param object
     * @returns {Function}
     */
    updateObject (object: Object): (dispatch: Dispatch) => Promise<void> {
        return this.getActionOfObject('UPDATE', object);
    }

    /**
     * Redux thunk actions for create or update object
     * @param object
     * @returns {Function}
     */
    saveObject (object: Object): (dispatch: Dispatch) => Promise<void> {
        if (object[this.config.primaryKey]) {
            return this.getActionOfObject('UPDATE', object);
        } else {
            return this.getActionOfObject('CREATE', object);
        }

    }

    /**
     * Redux thunk actions for delete object
     * @param object
     * @returns {Function}
     */
    deleteObject (object: Object): (dispatch: Dispatch) => Promise<void> {
        return this.getActionOfObject('DELETE', object);
    }

    /**
     * Redux thunk actions for each actions
     * Receive the object using defined cacheStrategy and set it on correspondent reducer
     * @param action
     * @param objectToPrepare
     * @returns {Function}
     *
     * Dispatched actions:
     * @actions LOADING
     * @actions LOADING_ONLINE
     * @actions LOADING_CACHE
     * @actions CREATE_OBJECT/UPDATE_OBJECT/DELETE_OBJECT
     */
    getActionOfObject (action: string, objectToPrepare: Object): (dispatch: Dispatch) => Promise<void> {
        return async (dispatch: Dispatch) => {
            try {
                // Set loading and error states
                this.setInitialLoadingAndError(dispatch);

                const {cacheStrategy, typePrefix, primaryKey} = this.config;
                // Prepare object to DB
                const object = this.prepareToServer({...objectToPrepare});
                // Define methods used for this actions
                const actions = this.actionMethods(action);

                // Objects created by cache and api
                let cacheObject = {};
                let onlineObject = {};

                // Apply cache method
                if (cacheStrategy !== 'Online') {
                    cacheObject = await actions.cacheMethod(typePrefix, object);
                    this.setLoadingFrom(dispatch, 'CACHE', false);
                    if (action !== 'DELETE') {
                        cacheObject = await this.populateObject(cacheObject);
                        actions.reduxMethod(dispatch, cacheObject);
                    } else {
                        actions.reduxMethod(dispatch, object);
                    }
                }

                // Check if some relation is defined only on cache
                const cacheRelation = this.hasNotSyncedRelation(object);

                const needToApplyOnline: boolean =
                    // AMSyncCache don't need to apply online
                    cacheStrategy !== 'Cache'
                    // If it's not CREATE, only accept if have a valid primary key
                    && (action === 'CREATE' || (action !== 'CREATE' && object[primaryKey] && object[primaryKey] > 0))
                    // If it's not DELETE, only accept if don't have cached relations
                    && (action === 'DELETE' || (action !== 'DELETE' && !cacheRelation));

                // Apply online method
                if (needToApplyOnline) {
                    onlineObject = await actions.onlineMethod(object);
                    onlineObject = this.prepareToClient(onlineObject);
                    this.setLoadingFrom(dispatch, 'ONLINE', false);
                }

                let objectToSync = null;
                switch (action) {
                case 'CREATE':
                    // On create, delete local cache and replace by online
                    if (Object.keys(cacheObject).length > 0 && Object.keys(onlineObject).length > 0) {
                        // Successful created online, replace on local cache
                        await this.replaceCreated(cacheObject, onlineObject);
                        objectToSync = await actions.syncMethod(onlineObject);
                        objectToSync = await this.populateObject(objectToSync);
                        actions.reduxMethod(dispatch, objectToSync);
                    } else {
                        let objectToReturn = {...cacheObject, ...onlineObject}
                        objectToReturn = await this.populateObject(objectToReturn);
                        actions.reduxMethod(dispatch, objectToReturn);
                    }
                    break;
                case 'UPDATE':
                    if (Object.keys(cacheObject).length > 0 && Object.keys(onlineObject).length > 0) {
                        objectToSync = await actions.syncMethod({...cacheObject, ...onlineObject});
                        objectToSync = await this.populateObject(objectToSync);
                        actions.reduxMethod(dispatch, objectToSync);
                    } else {
                        let objectToReturn = {...cacheObject, ...onlineObject}
                        objectToReturn = await this.populateObject(objectToReturn);
                        actions.reduxMethod(dispatch, objectToReturn);
                    }
                    break;
                case 'DELETE':
                    objectToSync = await actions.syncMethod(object);
                    actions.reduxMethod(dispatch, object);
                    break;
                }

                // Set loadings false
                this.setLoading(dispatch, false, false, false);
            } catch (error) {
                // On error, dispatch to reducer, cancel loadings and call custom callback
                this.setError(dispatch, error);
                this.setLoading(dispatch, false, false, false);
                AMSync.onUncaught(error);
            }
        };
    }

    /**
     * Redux thunk actions for get a single object by id
     * Receive the object using defined cacheStrategy and set it on correspondent reducer
     * @param id
     * @returns {Function}
     *
     * Dispatched actions:
     * @actions LOADING
     * @actions LOADING_ONLINE
     * @actions LOADING_CACHE
     * @actions GET_OBJECT
     */
    getObject (id: number): (dispatch: Dispatch) => Promise<void> {
        return async (dispatch: Dispatch) => {
            try {
                // Set loading and error states
                this.setInitialLoadingAndError(dispatch);

                const {cacheStrategy, typePrefix, primaryKey} = this.config;

                // Objects created by cache and api
                let cacheObject = {};
                let onlineObject = {};

                // Getting object from cache first
                if (cacheStrategy !== 'Online') {
                    // Find object on cache by  primaryKey
                    cacheObject = await AMCache.getObject(typePrefix, {[primaryKey]: id});
                    // Prepare object to client needs
                    cacheObject = this.prepareToClient(cacheObject);
                    // Populate object with defined relations
                    cacheObject = await this.populateObject(cacheObject);
                    this.setGetObject(dispatch, cacheObject);
                    this.setLoadingFrom(dispatch, 'CACHE', false);
                }

                // Found on cache?
                const foundOnCache = Object.keys(cacheObject).length > 0;

                // Need to search online?
                const needToSearchOnline = cacheStrategy === 'Online' || cacheStrategy === 'CacheOnline';

                // On CacheEmptyOnline, search online only if not found
                if (needToSearchOnline || (cacheStrategy === 'CacheEmptyOnline' && !foundOnCache)) {
                    // If no primary key on query, get it from cache to search online
                    if (cacheObject[primaryKey] && !id) {
                        id = cacheObject[primaryKey];
                    }
                    onlineObject = await this.getOneOnline(id);
                    onlineObject = this.prepareToClient(onlineObject);

                    let objectToReturn = onlineObject;

                    // Solve possible conflicts with online and cache objects
                    if (cacheStrategy !== 'Online' && onlineObject) {
                        objectToReturn = await this.solveObject(onlineObject);
                        // Return empty object if not found or deleted
                        if (!objectToReturn) {
                            objectToReturn = {};
                        }
                    }

                    // Populate final object
                    objectToReturn = await this.populateObject(objectToReturn);

                    // Dispatch actions with final objects
                    this.setGetObject(dispatch, objectToReturn);
                    this.setLoadingFrom(dispatch, 'ONLINE', false);

                }
                // Set loadings false
                this.setLoading(dispatch, false, false, false);
            } catch (error) {
                // On error, dispatch to reducer, cancel loadings and call custom callback
                this.setError(dispatch, error);
                this.setLoading(dispatch, false, false, false);
                AMSync.onUncaught(error);
            }
        };
    }

    /**
     * Redux thunk actions for get a single object by id
     * Receive the object using defined cacheStrategy and set it on correspondent reducer
     * @returns {Function}
     *
     * Dispatched actions:
     * @actions LOADING
     * @actions LOADING_ONLINE
     * @actions LOADING_CACHE
     * @actions GET_OBJECTS
     */
    getObjects (): (dispatch: Dispatch) => Promise<void> {
        return async (dispatch: Dispatch) => {
            try {
                // Set loading and error states
                this.setInitialLoadingAndError(dispatch);

                const {cacheStrategy, typePrefix} = this.config;

                // Objects created by cache and api
                let cacheObjects = [];
                let onlineObjects = [];

                // Getting object from cache first
                if (cacheStrategy !== 'Online') {
                    // Find object on cache by primaryKey
                    cacheObjects = await AMCache.getObjects(typePrefix);
                    // Prepare objects to client needs
                    cacheObjects = cacheObjects.map(item => this.prepareToClient(item));
                    // Populate objects with defined relations
                    cacheObjects = await this.populateObjects(cacheObjects);
                    this.setGetObjects(dispatch, cacheObjects);
                    this.setLoadingFrom(dispatch, 'CACHE', false);
                }
                // Found on cache?
                const foundOnCache = cacheObjects && cacheObjects.length > 0;

                // Need to search online?
                const needToSearchOnline = cacheStrategy === 'Online' || cacheStrategy === 'CacheOnline';

                // On CacheEmptyOnline, search online only if not found
                if (needToSearchOnline || (cacheStrategy === 'CacheEmptyOnline' && !foundOnCache)) {
                    onlineObjects = await this.getAllOnline();
                    onlineObjects = onlineObjects.map(item => this.prepareToClient(item));

                    let objectsToReturn = onlineObjects;

                    // Solve possible conflicts with online and cache objects
                    if (cacheStrategy !== 'Online' && onlineObjects) {
                        objectsToReturn = await this.solveObjects(onlineObjects);
                    }

                    // Populate final object
                    objectsToReturn = await this.populateObjects(objectsToReturn);

                    // Dispatch actions with objects
                    this.setGetObjects(dispatch, objectsToReturn);
                    this.setLoadingFrom(dispatch, 'ONLINE', false);
                }
                // Set loadings false
                this.setLoading(dispatch, false, false, false);
            } catch (error) {
                // On error, dispatch to reducer, cancel loadings and call custom callback
                this.setError(dispatch, error);
                this.setLoading(dispatch, false, false, false);
                AMSync.onUncaught(error);
            }
        };
    }

    /**
     * All the cache update conflicts -
     * - Keep objects created on cache but not online
     * - Delete objects not returned online but have a onlineId on cache
     * - Create objects returned online that are not on cache
     * - Solve conflicts on objects that return online but was already on cache
     * @param onlineObjects
     * @returns {Promise<void>}
     */
    async solveObjects (onlineObjects: Array<OnlineObject>): Promise<Array<Object>> {
        const {typePrefix, primaryKey} = this.config;
        const objectsToReturn = [];

        // Objects created on cache but not online
        const objectsOnlyCache = await AMCache.getObjects(typePrefix, `${primaryKey} < 0`);

        for (const onlineObject of onlineObjects) {
            const objectToKeep = await this.solveObject(onlineObject);
            if (objectToKeep) {
                objectsToReturn.push(objectToKeep);
            }
        }
        return [...objectsOnlyCache, ...objectsToReturn];
    }

    /**
     * All the cache update conflicts -
     * - Keep objects created on cache but not online
     * - Delete objects not returned online but have a onlineId on cache
     * - Create objects returned online that are not on cache
     * - Solve conflicts on objects that return online but was already on cache
     * @param onlineObject
     * @returns {Promise<void>}
     */
    async solveObject (onlineObject: OnlineObject): Promise<Object | null> {
        const {typePrefix, conflictRule, primaryKey} = this.config;

        // Try to find object on cache
        const cacheObject = await AMCache.getObject(typePrefix, {[primaryKey]: onlineObject[primaryKey]});

        // Object is deleted online
        if (onlineObject.deletedAt) {
            if (cacheObject) {
                await this.setObjectDeleted(cacheObject);
            }
        } else {
            if (!cacheObject) {
                // Object is not on cache, so cache it!
                let createdObject = await AMCache.createObject(typePrefix, onlineObject);
                createdObject = await this.setObjectCreated(createdObject);
                // Return created object
                return createdObject;
            } else {
                // Deal only with objects not deleted on cache
                if (!cacheObject._cacheDeletedAt) {
                    // Object already on cache, solve conflict
                    let objectToKeep = null;
                    if (conflictRule) {
                        // Custom conflict solution (defined on config)
                        objectToKeep = conflictRule(cacheObject, onlineObject);
                    } else {
                        // No custom conflict solution defined on config, just merge both objects
                        objectToKeep = {...onlineObject, ...cacheObject};
                    }
                    // UPDATE CACHE??? HOW???
                    return objectToKeep;
                }
            }
        }
        return null;
    }

    /**
     * Populate list of objects with related that are already on cache
     * @param objects
     * @returns {Promise<Array>}
     */
    async populateObjects (objects: Array<CacheObject | OnlineObject>): Promise<Array<CacheObject | OnlineObject>> {
        let populatedList = [];
        for (const object of objects) {
            populatedList.push(await this.populateObject(object));
        }
        return populatedList;
    }

    /**
     * Populate object with related that are already on cache
     * @param object
     * @returns {Promise<CacheObject | OnlineObject>}
     */
    async populateObject (object: CacheObject | OnlineObject): Promise<CacheObject | OnlineObject> {
        const {foreignField, primaryKey, relations} = this.config;
        let populatedObject = {};
        // The foreignField is a list of objects with foreign key on this 'object'
        for (const foreignItem of foreignField) {
            // Don't populate if it's not explicit on config
            if (!foreignItem.populate) {
                continue;
            }
            // Finding object on cache
            const foreignKey = foreignItem.field;
            const cacheName = foreignItem.table.toUpperCase();
            populatedObject[foreignItem.table] = await AMCache.getObject(cacheName, {[primaryKey]: object[foreignKey]});

        }
        // The relations is a list of objects with keys that relation with the primary key of 'object'
        for (const relation of relations) {
            // Don't populate if it's not explicit on config
            if (!relation.populate) {
                continue;
            }
            // Finding objects on cache
            const foreignKey = relation.field;
            const cacheName = relation.table.toUpperCase();
            populatedObject[relation.table] = await AMCache.getObjects(cacheName, {[foreignKey]: object[primaryKey]});

        }
        return {...object, ...populatedObject};
    }

    /**
     * Find if object have foreign relations that are not synced (negative id)
     * @param object
     * @returns {boolean}
     */
    hasNotSyncedRelation (object: CacheObject): boolean {
        const {foreignField} = this.config;
        // No foreignField defined, table without relation
        if (!foreignField) {
            return false;
        }
        let hasNotSynced = false;
        for (const relation of foreignField) {
            // Trying to find a foreignField with negative ID, meaning that is only existing on cache
            if (object[relation.field] && object[relation.field] < 0) {
                hasNotSynced = true;
            }
        }
        return hasNotSynced;
    }

    /**
     * When a object is synced, find all objects with relations on other tables and update the relation primaryKey
     * @param oldPrimary
     * @param newPrimary
     * @returns {Promise<boolean>}
     */
    async syncRelations (oldPrimary: number, newPrimary: number): Promise<boolean> {
        const {relations} = this.config;
        // No relation defined
        if (!relations || relations.length < 1) {
            return false;
        }
        for (const relation of relations) {
            // Fiend all objects with relations with the oldPrimary value
            const children = await AMCache.getObjects(relation.table, `${relation.field} = ${oldPrimary}`);
            for (const childObject of children) {
                // Check if field need update - Only for debugging
                if (childObject[relation.field] > 0) {
                    console.error('Child Object with positive primary key on syncRelations, but updating anyway.');
                }
                if (childObject[relation.field] === newPrimary) {
                    console.error('Child Object with primary key already updated on syncRelations, but updating anyway.');
                }
                childObject[relation.field] = newPrimary;
                await AMCache.updateObject(relation.table, childObject);
            }
        }
        return true;
    }

    // ------------------------- API METHODS -------------------------

    /**
     * POST object to API using parameters of defined config
     * @param object
     * @returns {Promise<Object>}
     */
    async createOnline (object: Object): Promise<Object> {
        let response = {};
        const objectToCreate = {...object, [this.config.primaryKey]: undefined};
        try {
            response = await Http.post(this.config.endPoint + (this.config.createSuffix || ''), objectToCreate);
        } catch (error) {
            response = {};
            AMSync.onConnectionFailed(error);
        }
        return response;
    }

    /**
     * PUT object to API using parameters of defined config
     * @param object
     * @returns {Promise<Object>}
     */
    async updateOnline (object: Object): Promise<Object> {
        // Object primaryKey is required
        if (!object[this.config.primaryKey]) {
            throw new Error('Object without primaryKey on update.');
        }
        const id = object[this.config.primaryKey];
        let response = {};
        try {
            response = await Http.put(this.config.endPoint + id + (this.config.updateSuffix || ''), object);
        } catch (error) {
            response = {};
            AMSync.onConnectionFailed(error);
        }
        return response;
    }

    /**
     * DELETE object on API using parameters of defined config
     * @param object
     * @returns {Promise<Object>}
     */
    async deleteOnline (object: Object): Promise<Object> {
        // Object primaryKey is required
        if (!object[this.config.primaryKey]) {
            throw new Error('Object without primaryKey on delete.');
        }
        const id = object[this.config.primaryKey];
        let response = {};
        try {
            response = await Http.delete(this.config.endPoint + id + (this.config.deleteSuffix || ''), object);
        } catch (error) {
            response = {};
            AMSync.onConnectionFailed(error);
        }
        return response;
    }

    /**
     * GET object on API using parameters of defined config
     * @param id
     * @returns {Promise<Object>}
     */
    async getOneOnline (id: number | string): Promise<Object> {
        return Http.get(this.config.endPoint + id);
    }

    /**
     * GET objects on API using parameters of defined config
     * @returns {Promise<Object>}
     */
    async getAllOnline (): Promise<Object> {
        return Http.get(this.config.endPoint);
    }

    // ------------------------- SYNC METHODS -------------------------

    /**
     * On creation of object online, replace cache by incoming object
     * @param cacheObject
     * @param onlineObject
     * @returns {Promise<OnlineObject>}
     */
    async replaceCreated (cacheObject: CacheObject, onlineObject: OnlineObject): Promise<OnlineObject> {
        const {typePrefix, primaryKey} = this.config;
        // Replace cacheObject by incoming onlineObject, so the object will have the correct primaryKey
        await AMCache.deleteObject(typePrefix, cacheObject);
        await AMCache.createObject(typePrefix, onlineObject);
        // Replace the primaryKey on all relations by the online primaryKey
        await this.syncRelations(cacheObject[primaryKey], onlineObject[primaryKey]);

        return onlineObject;
    }

    /**
     * Create online all objects created only on cache
     * @returns {Promise<Array<Object>>}
     */
    async syncCreatedObjects (): Promise<Array<Object>> {
        const result = [];
        // Get all objects with _cacheCreatedAt on cache
        const cacheObjects = await this.getObjectsToCreate();
        for (const cacheObject of cacheObjects) {
            try {
                const onlineObject = await this.createOnline(cacheObject);
                if (onlineObject && onlineObject[this.config.primaryKey]) {
                    // Replace cacheObject with onlineObject
                    await this.replaceCreated(cacheObject, onlineObject);
                    // Sync API response
                    const object = await this.setObjectCreated(onlineObject);
                    result.push(object);
                }
            } catch (error) {
                AMSync.onConnectionFailed(error);
            }
        }
        return result;
    }

    /**
     * Update online all objects updated only on cache
     * @returns {Promise<Array<Object>>}
     */
    async syncUpdatedObjects (): Promise<Array<Object>> {
        const result = [];
        // Get all objects with _cacheUpdatedAt on cache
        const cacheObjects = await this.getObjectsToUpdate();
        for (const cacheObject of cacheObjects) {
            try {
                const onlineObject = await this.updateOnline(cacheObject);
                if (onlineObject && onlineObject[this.config.primaryKey]) {
                    // Sync API response
                    const object = await this.setObjectUpdated(onlineObject);
                    result.push(object);
                }
            } catch (error) {
                AMSync.onConnectionFailed(error);
            }
        }
        return result;
    }

    /**
     * Delete online all objects deleted only on cache
     * @returns {Promise<Array<Object>>}
     */
    async syncDeletedObjects (): Promise<Array<Object>> {
        const result = [];
        // Get all objects with _cacheDeletedAt on cache
        const cacheObjects = await this.getObjectsToDelete();
        for (const cacheObject of cacheObjects) {
            try {
                const onlineObject = await this.deleteOnline(cacheObject);
                if (onlineObject && onlineObject[this.config.primaryKey]) {
                    // Sync API response
                    const object = await this.setObjectDeleted(onlineObject);
                    result.push(object);
                }
            } catch (error) {
                AMSync.onConnectionFailed(error);
            }
        }
        return result;
    }

    /**
     * Get all objects on cache that need to be created online (with _cacheCreatedAt)
     * @returns {Promise<Array<Object>>}
     */
    async getObjectsToCreate (): Promise<Array<Object>> {
        return AMCache.getAllObjects(this.config.typePrefix, '_cacheCreatedAt != null');
    }

    /**
     * Get all objects on cache that need to be updated online (with _cacheUpdatedAt)
     * @returns {Promise<Array<Object>>}
     */
    async getObjectsToUpdate (): Promise<Array<Object>> {
        return AMCache.getAllObjects(this.config.typePrefix, '_cacheUpdatedAt != null');
    }

    /**
     * Get all objects on cache that need to be deleted online (with _cacheDeletedAt)
     * @returns {Promise<Array<Object>>}
     */
    async getObjectsToDelete (): Promise<Array<Object>> {
        return AMCache.getAllObjects(this.config.typePrefix, '_cacheDeletedAt != null');
    }

    /**
     * Set cache of register as created, removing the _cacheCreatedAt
     * Also will update de value of register with the incoming values
     * Object is found by the primaryKey
     * @param value
     * @returns {Promise<Object>}
     */
    async setObjectCreated (value: Object): Promise<Object> {
        return AMCache.setValueAndCleanCacheData(this.config.typePrefix, value);
    }

    /**
     * Set cache of object as updated, removing the _cacheUpdatedAt
     * Also will update de value of register with the incoming values
     * Object is found by the primaryKey
     * @param value
     * @returns {Promise<Object>}
     */
    async setObjectUpdated (value: Object): Promise<Object> {
        return AMCache.setValueAndCleanCacheData(this.config.typePrefix, value);
    }

    /**
     * Set cache of object as deleted, removing it from cache
     * Object is found by the primaryKey
     * @param value
     * @returns {Promise<Object>}
     */
    async setObjectDeleted (value: Object): Promise<void> {
        return AMCache.deleteFromCacheData(this.config.typePrefix, value);
    }

    // ------------------------- DISPATCHES -------------------------

    /**
     * Dispatch Redux thunk actions CREATE_OBJECT with the value of object as payload
     * @param dispatch
     * @param object
     */
    setCreateObject (dispatch: Dispatch, object: Object): void {
        dispatch({type: this.type('CREATE_OBJECT'), payload: object});
    }

    /**
     * Dispatch Redux thunk actions UPDATE_OBJECT with the value of object as payload
     * @param dispatch
     * @param object
     */
    setUpdateObject (dispatch: Dispatch, object: Object): void {
        dispatch({type: this.type('UPDATE_OBJECT'), payload: object});
    }

    /**
     * Dispatch Redux thunk actions SAVE_OBJECT with the value of object as payload
     * This action is used for create and update
     * @param dispatch
     * @param object
     */
    setSaveObject (dispatch: Dispatch, object: Object): void {
        dispatch({type: this.type('SAVE_OBJECT'), payload: object});
    }

    /**
     * Dispatch Redux thunk actions GET_OBJECT with the value of object as payload
     * @param dispatch
     * @param object
     */
    setGetObject (dispatch: Dispatch, object: Object): void {
        dispatch({type: this.type('GET_OBJECT'), payload: object});
    }

    /**
     * Dispatch Redux thunk actions GET_OBJECTS with the value of objects as payload
     * @param dispatch
     * @param objects
     */
    setGetObjects (dispatch: Dispatch, objects: Array<Object>): void {
        dispatch({type: this.type('GET_OBJECTS'), payload: objects});
    }

    /**
     * Dispatch Redux thunk actions DELETE_OBJECT with the value of objects as payload
     * @param dispatch
     * @param objects
     */
    setDeleteObject (dispatch: Dispatch, objects: Array<Object>): void {
        dispatch({type: this.type('DELETE_OBJECT'), payload: objects});
    }

    /**
     * Dispatch Redux thunk actions with custom loading state set
     * @param dispatch
     * @param loadingType - ONLINE or CACHE
     * @param isLoading
     */
    setLoadingFrom (dispatch: Dispatch, loadingType: string, isLoading: boolean): void {
        dispatch({type: this.type('LOADING_' + loadingType), payload: isLoading});
    };

    /**
     * Dispatch Redux thunk actions for set error on correspondent reducer
     * @param dispatch
     * @param error
     */
    setError (dispatch: Dispatch, error: Error | null) {
        dispatch({type: this.type('ERROR'), payload: error});
    };

    /**
     * Dispatch actions to set the state of loading for each situation
     * Set general loading, online loading and cache loading
     * @param dispatch
     * @param isLoading
     * @param isLoadingCache
     * @param isLoadingOnline
     *
     * Dispatched actions:
     * @actions LOADING
     * @actions LOADING_ONLINE
     * @actions LOADING_CACHE
     */
    setLoading (dispatch: Dispatch, isLoading: boolean, isLoadingCache: boolean, isLoadingOnline: boolean): void {
        // Default loading
        dispatch({type: this.type('LOADING'), payload: isLoading});

        // Online loading
        if (isLoadingCache !== undefined) {
            dispatch({type: this.type('LOADING_CACHE'), payload: isLoadingCache});
        }

        // AMSyncCache loading
        if (isLoadingOnline !== undefined) {
            dispatch({type: this.type('LOADING_ONLINE'), payload: isLoadingOnline});
        }
    }

    /**
     * Dispatch Redux thunk actions for reset error and loadings
     * @param dispatch
     */
    setInitialLoadingAndError (dispatch: Dispatch) {
        // Set loading and error states
        const isLoading = true;
        const isCacheLoading = this.config.cacheStrategy !== 'Online';
        const isOnlineLoading = this.config.cacheStrategy !== 'Cache';
        this.setLoading(dispatch, isLoading, isCacheLoading, isOnlineLoading);
        this.setError(dispatch, null);
    }

    // ------------------------- GENERAL METHODS -------------------------

    /**
     * Get actions name for reducer of the instance
     * @param action
     * @returns {string}
     */
    type (action: string): string {
        return this.config.typePrefix + '_' + action;
    }

    /**
     * View actions for set input state of reducer
     * @param key
     * @param value
     * @returns Action
     */
    inputChanged (key: string, value: Object): Action {
        return {type: this.type('INPUT_CHANGED'), payload: {key, value}};
    };

    /**
     * Validating object with config validator
     * @param item
     * @returns Action
     */
    validateObject (item: Object): Action {
        let error = null;
        if (this.config.validateObject) {
            error = this.config.validateObject(item);
        }
        if (error) {
            return {type: this.type('VALID'), payload: {message: error}};
        } else {
            return {type: this.type('VALID'), payload: true};
        }
    };

    /**
     * Change Object to fit server requirements
     * @param item
     * @returns {Object}
     */
    prepareToServer (item: Object): Object {
        if (this.config.prepareToServer) {
            item = this.config.prepareToServer(item);
        }
        return item;
    };

    /**
     * Change object to fit client needs
     * @param item
     * @returns {Object}
     */
    prepareToClient (item: Object): Object {
        if (this.config.prepareToClient) {
            item = this.config.prepareToClient(item);
        }
        return item;
    };

    /**
     * Define a custom callback for uncaught errors
     * @param callback
     */
    static setUncaughtErrorCallback (callback: (error: Error) => void): void {
        AMSync.errorCallback = callback;
    }

    /**
     * Define a custom callback for api errors
     * @param callback
     */
    static setApiErrorCallback (callback: (error: Error) => void): void {
        AMSync.connectionFailCallback = callback;
    }

    /**
     * Method for unexpected errors. Define a errorCallback for a custom error solution
     * @param error
     */
    static onUncaught (error: Error): void {
        if (AMSync.errorCallback) {
            AMSync.errorCallback(error);
        } else {
            console.warn('Optional error callback not defined on sync class, but a error was thrown');
            console.warn(error);
        }
    }

    /**
     * Method for api errors. Define a errorCallback for a custom error solution
     * @param error
     */
    static onConnectionFailed (error: Error): void {
        if (AMSync.connectionFailCallback) {
            AMSync.connectionFailCallback(error);
        }
    }

}

export type SyncType = AMSync;
export default AMSync;