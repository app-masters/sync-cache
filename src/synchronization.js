// @flow
import Cache from './cache';
import { Http } from '@app-masters/js-lib';
import type { SyncConfig, Dispatch, Action, OnlineObject, CacheObject } from './customTypes';

class Synchronization {
    // Attributes of Synchronization Class
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

        // Verify indexKey incoming config
        if (!config.primaryKey || config.primaryKey.length < 1) {
            throw new Error('You must set an indexKey on your config');
        }

        // Set cacheStrategy as 'CacheOnline' if none is defined
        if (!config.cacheStrategy || ['CacheOnline', 'CacheEmptyOnline', 'Cache', 'Online'].indexOf(config.cacheStrategy) < 0) {
            config.cacheStrategy = 'CacheOnline';
        }

        // Define a default primary key for incoming objects
        if (!config.primaryKey) {
            config.primaryKey = '_id';
        }

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
                cacheMethod: Cache.createObject,
                onlineMethod: this.createOnline.bind(this),
                reduxMethod: this.setCreateObject.bind(this),
                syncMethod: this.setObjectCreated.bind(this)
            };
        case 'UPDATE':
            return {
                cacheMethod: Cache.updateObject,
                onlineMethod: this.updateOnline.bind(this),
                reduxMethod: this.setUpdateObject.bind(this),
                syncMethod: this.setObjectUpdated.bind(this)
            };
        case 'DELETE':
            return {
                cacheMethod: Cache.deleteObject,
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

                const {cacheStrategy, typePrefix} = this.config;
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
                    actions.reduxMethod(dispatch, cacheObject);
                }

                // Apply online method
                if (cacheStrategy !== 'Cache') {
                    onlineObject = await actions.onlineMethod(object);
                    onlineObject = this.config.prepareToClient(onlineObject);
                    this.setLoadingFrom(dispatch, 'ONLINE', false);
                }

                if (action !== 'DELETE') {
                    // If both succeed, merge and set on cache to keep the _id and _cacheId
                    let objectToReturn = {...cacheObject, ...onlineObject};
                    if (Object.keys(cacheObject).length > 0 && Object.keys(onlineObject).length > 0) {
                        objectToReturn = await actions.syncMethod(objectToReturn);
                    }

                    // Dispatch object
                    actions.reduxMethod(dispatch, objectToReturn);
                } else {
                    // On delete, onlineObject and cacheObject are erased on success
                    if (cacheStrategy !== 'Online' && !onlineObject) {
                        await actions.syncMethod(object);
                    }
                    actions.reduxMethod(dispatch, object);
                }

                // Set loadings false
                this.setLoading(dispatch, false, false, false);
            } catch (error) {
                console.error(error);
            }
        };
    }

    /**
     * Redux thunk actions for get a single object by id
     * Receive the object using defined cacheStrategy and set it on correspondent reducer
     * @param cacheId
     * @param id
     * @returns {Function}
     *
     * Dispatched actions:
     * @actions LOADING
     * @actions LOADING_ONLINE
     * @actions LOADING_CACHE
     * @actions GET_OBJECT
     */
    getObject (cacheId: number, id: number): (dispatch: Dispatch) => Promise<void> {
        return async (dispatch: Dispatch) => {
            try {
                // Set loading and error states
                this.setInitialLoadingAndError(dispatch);

                const {cacheStrategy, typePrefix} = this.config;

                // Objects created by cache and api
                let cacheObject = {};
                let onlineObject = {};

                // Getting object from cache first
                if (cacheStrategy !== 'Online') {
                    // Find object on cache by _cacheId or _id
                    cacheObject = await Cache.getObject(typePrefix, {_cacheId: cacheId, _id: id});
                    this.setGetObject(dispatch, cacheObject);
                    this.setLoadingFrom(dispatch, 'CACHE', false);
                }
                // Found on cache?
                const foundOnCache = Object.keys(cacheObject).length > 0;

                // Need to search online?
                const needToSearchOnline = cacheStrategy === 'Online' || cacheStrategy === 'CacheOnline';

                // On CacheEmptyOnline, search online only if not found
                if (needToSearchOnline || (cacheStrategy === 'CacheEmptyOnline' && !foundOnCache)) {
                    onlineObject = await this.getOneOnline(id);
                    onlineObject = this.config.prepareToClient(onlineObject);

                    let objectToReturn = onlineObject;

                    // Solve possible conflicts with online and cache objects
                    if (cacheStrategy !== 'Online' && onlineObject) {
                        objectToReturn = await this.solveObject(onlineObject);
                        // Return empty object if not found or deleted
                        if (!objectToReturn) {
                            objectToReturn = {};
                        }
                    }

                    // Dispatch actions with final objects
                    this.setGetObject(dispatch, objectToReturn);
                    this.setLoadingFrom(dispatch, 'ONLINE', false);

                }
                // Set loadings false
                this.setLoading(dispatch, false, false, false);
            } catch (error) {
                console.error(error);
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
                    // Find object on cache by _cacheId or _id
                    cacheObjects = await Cache.getObjects(typePrefix);
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
                    onlineObjects = onlineObjects.map(item => this.config.prepareToClient(item));

                    let objectsToReturn = onlineObjects;

                    // Solve possible conflicts with online and cache objects
                    if (cacheStrategy !== 'Online' && onlineObjects) {
                        objectsToReturn = await this.solveObjects(onlineObjects);
                    }

                    // Dispatch actions with objects
                    this.setGetObjects(dispatch, objectsToReturn);
                    this.setLoadingFrom(dispatch, 'ONLINE', false);
                }
                // Set loadings false
                this.setLoading(dispatch, false, false, false);
            } catch (error) {
                console.error(error);
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
        const {typePrefix} = this.config;
        const objectsToReturn = [];

        // Objects created on cache but not online
        const objectsOnlyCache = await Cache.getObjects(typePrefix, '_id = null');

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
        const {typePrefix, conflictRule} = this.config;

        // Try to find object on cache
        const cacheObject = await Cache.getObject(typePrefix, {_id: onlineObject._id});

        // Object is deleted online
        if (onlineObject.deletedAt) {
            if (cacheObject) {
                await this.setObjectDeleted(cacheObject);
            }
        } else {
            if (!cacheObject) {
                // Object is not on cache, so cache it!
                let createdObject = await Cache.createObject(typePrefix, onlineObject);
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

    // ------------------------- API METHODS -------------------------

    /**
     * POST object to API using parameters of defined config
     * @param object
     * @returns {Promise<Object>}
     */
    async createOnline (object: Object): Promise<Object> {
        let response = {};
        try {
            response = await Http.post(this.config.endPoint + (this.config.createSuffix || ''), object);
        } catch (error) {
            response = {};
        }
        return response;
    }

    /**
     * PUT object to API using parameters of defined config
     * @param object
     * @returns {Promise<Object>}
     */
    async updateOnline (object: Object): Promise<Object> {
        // Object._id is required
        if (!object._id) {
            throw new Error('Object without _id on update.');
        }
        const id = object._id;
        let response = {};
        try {
            response = await Http.put(this.config.endPoint + id + (this.config.updateSuffix || ''), object);
        } catch (error) {
            response = {};
        }
        return response;
    }

    /**
     * DELETE object on API using parameters of defined config
     * @param object
     * @returns {Promise<Object>}
     */
    async deleteOnline (object: Object): Promise<Object> {
        // Object._id is required
        if (!object._id) {
            throw new Error('Object without _id on delete.');
        }
        const id = object._id;
        let response = {};
        try {
            response = await Http.delete(this.config.endPoint + id + (this.config.deleteSuffix || ''), object);
        } catch (error) {
            response = {};
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
     * Create online all objects created only on cache
     * @returns {Promise<Array<Object>>}
     */
    async syncCreatedObjects (): Promise<Array<Object>> {
        const result = [];
        // Get all objects with _cacheCreatedAt on cache
        const cacheObjects = await this.getObjectsToCreate();
        for (const cacheObject of cacheObjects) {
            try {
                const objectOnline = await this.createOnline(cacheObject);
                if (objectOnline && objectOnline._id) {
                    // Merge API result with cache to keep the _cacheId
                    const object = await this.setObjectCreated({...cacheObject, ...objectOnline});
                    result.push(object);
                }
            } catch (error) {
                console.error('Failed to sync object');
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
                const objectOnline = await this.updateOnline(cacheObject);
                if (objectOnline && objectOnline._id) {
                    // Merge API result with cache to keep the _cacheId
                    const object = await this.setObjectUpdated({...cacheObject, ...objectOnline});
                    result.push(object);
                }
            } catch (error) {
                console.error('Failed to sync object');
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
                const objectOnline = await this.deleteOnline(cacheObject);
                if (objectOnline && objectOnline._id) {
                    // Merge API result with cache to keep the _cacheId
                    const object = await this.setObjectDeleted({...cacheObject, ...objectOnline});
                    result.push(object);
                }
            } catch (error) {
                console.error('Failed to sync object');
            }
        }
        return result;
    }

    /**
     * Get all objects on cache that need to be created online (with _cacheCreatedAt)
     * @returns {Promise<Array<Object>>}
     */
    async getObjectsToCreate (): Promise<Array<Object>> {
        return Cache.getAllObjects(this.config.typePrefix, '_cacheCreatedAt != null');
    }

    /**
     * Get all objects on cache that need to be updated online (with _cacheUpdatedAt)
     * @returns {Promise<Array<Object>>}
     */
    async getObjectsToUpdate (): Promise<Array<Object>> {
        return Cache.getAllObjects(this.config.typePrefix, '_cacheUpdatedAt != null');
    }

    /**
     * Get all objects on cache that need to be deleted online (with _cacheDeletedAt)
     * @returns {Promise<Array<Object>>}
     */
    async getObjectsToDelete (): Promise<Array<Object>> {
        return Cache.getAllObjects(this.config.typePrefix, '_cacheDeletedAt != null');
    }

    /**
     * Set cache of register as created, removing the _cacheCreatedAt
     * Also will update de value of register with the incoming values
     * Object is found by the _cacheId
     * @param value
     * @returns {Promise<Object>}
     */
    async setObjectCreated (value: Object): Promise<Object> {
        return Cache.setValueAndCleanCacheData(this.config.typePrefix, value);
    }

    /**
     * Set cache of object as updated, removing the _cacheUpdatedAt
     * Also will update de value of register with the incoming values
     * Object is found by the _cacheId
     * @param value
     * @returns {Promise<Object>}
     */
    async setObjectUpdated (value: Object): Promise<Object> {
        return Cache.setValueAndCleanCacheData(this.config.typePrefix, value);
    }

    /**
     * Set cache of object as deleted, removing it from cache
     * Object is found by the _cacheId
     * @param value
     * @returns {Promise<Object>}
     */
    async setObjectDeleted (value: Object): Promise<void> {
        return Cache.deleteFromCacheData(this.config.typePrefix, value);
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

        // Cache loading
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

}

export default Synchronization;