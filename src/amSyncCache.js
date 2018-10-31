// @flow

import toPlainObject from 'lodash/toPlainObject';
import type { Storage } from './customTypes';

class AMSyncCache {
    // Statics of AMSyncCache Class
    static storage: Storage; // Storage class
    static lastId: number; // Last saved cache Id number
    static primaryKey: string; // Primary key used by external database

    /**
     * Set the storage class used by the cache
     * @param storage
     */
    static setStorage (storage: Storage) {
        AMSyncCache.storage = storage;
    }

    /**
     * Set the primary key used on queries
     * Primary key is defined by external database
     * @param primaryKey - default: _id
     */
    static setPrimaryKey (primaryKey: string) {
        AMSyncCache.primaryKey = primaryKey;
    }

    /**
     * Create object on cache and set private attribute to show that it's not created online yet
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async createObject (key: string, value: Object): Promise<Object> {
        // Set as created date only on cache
        const data = {
            _cacheCreatedAt: new Date(),
            _cacheUpdatedAt: null,
            _cacheDeletedAt: null,
            _needSync: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...value
        };
        if (!data[AMSyncCache.primaryKey]) {
            let cacheId = -(new Date()).getTime();
            if (AMSyncCache.lastId) {
                cacheId = AMSyncCache.lastId - 1;
                AMSyncCache.lastId = cacheId;
            }
            data[AMSyncCache.primaryKey] = cacheId;
        }

        // Create object on cache and any class extras
        const item = await AMSyncCache.storage.createItem(key, data);
        return AMSyncCache.toPlain(item);
    }

    /**
     * Get first object on cache that match query object or match query string
     * If primaryKey are on object, it will use them as index for the search
     * @param key - Must be a valid schema name
     * @param query {Object | string}
     * @param returnInstance [optional] - Return instance of the register (not a plain object)
     * @returns {Promise<*>}
     */
    static async getObject (key: string, query: { _id?: ?number, [any]: any } | string, returnInstance: ?boolean): Promise<Object> {
        let item = null;
        if ((typeof query) !== 'string' && query[AMSyncCache.primaryKey]) {
            // Filter by primaryKey
            item = await AMSyncCache.storage.getItems(key, {[AMSyncCache.primaryKey]: query[AMSyncCache.primaryKey]});
        } else {
            // Filter by another object or check string
            item = await AMSyncCache.storage.getItems(key, query);
        }
        // Don't return invalid
        if (item && item[0]) {
            if (returnInstance) {
                return item[0];
            } else {
                return AMSyncCache.toPlain(item[0]);
            }
        }
        return {};
    }

    /**
     * Get all object on cache that match query object or match query string
     * Objects with _cacheDeletedAt are not returned
     * @param key - Must be a valid schema name
     * @param query {Object | string}
     * @returns {Promise<Array<Object>>}
     */
    static async getObjects (key: string, query: ?Object | ?string): Promise<Array<Object>> {
        // Get items and filter by query
        let data = [];
        if (query) {
            data = await AMSyncCache.storage.getItems(key, query);
        } else {
            data = await AMSyncCache.storage.getItems(key);
        }

        const items = [];
        // Verify if some object is found by the query
        if (data) {
            for (const item of data) {
                // Don't return invalid or already deleted items'
                if (item && !item._cacheDeletedAt) {
                    items.push(AMSyncCache.toPlain(item));
                }
            }
        }
        return items;
    }

    /**
     * Get all object on cache that match query object or match query string
     * WARNING: Even objects with _cacheDeletedAt are returned on this method
     * @param key - Must be a valid schema name
     * @param query {Object | string}
     * @returns {Promise<Array<Object>>}
     */
    static async getAllObjects (key: string, query: Object | string): Promise<Array<Object>> {
        // Get items and filter by query
        const data = await AMSyncCache.storage.getItems(key, query);
        const items = [];
        // Verify if some object is found by the query
        if (data) {
            for (const item of data) {
                // Don't return invalid or already deleted items'
                if (item) {
                    items.push(AMSyncCache.toPlain(item));
                }
            }
        }
        return items;
    }

    /**
     * Find and update object on cache and set private attribute to show that it's not updated online yet
     * Value must have a primaryKey to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async updateObject (key: string, value: { _id?: ?number, [any]: any }): Promise<Object> {
        let item = await AMSyncCache.findObject(key, value);
        let data = {};
        if (item._cacheCreatedAt) {
            // It's created only on AMSyncCache.storage, so don't need to update online
            data = {
                ...value,
                _cacheCreatedAt: new Date(),
                _cacheUpdatedAt: null,
                _cacheDeletedAt: null,
                _needSync: true,
                updatedAt: new Date()

            };
        } else {
            // It's already created online, so need to update
            data = {
                ...value,
                _cacheCreatedAt: null,
                _cacheUpdatedAt: new Date(),
                _cacheDeletedAt: null,
                _needSync: true,
                updatedAt: new Date()
            };
        }
        // Merge cache item with new data and update on cache
        const newValue = AMSyncCache.toPlain({...item, ...data});
        item = await AMSyncCache.storage.updateItem(key, newValue);
        return AMSyncCache.toPlain(item);
    }

    /**
     * Find and update each object on cache and set private attribute to show that it's not updated online yet
     * Each value on array must have a primaryKey to be found
     * @param key - Must be a valid schema name
     * @param values
     * @returns {Promise<Array<Object>>}
     */
    static async updateObjects (key: string, values: Array<{ _id?: ?number, [any]: any }>): Promise<Array<Object>> {
        const updateArray = [];
        for (const value of values) {
            updateArray.push(AMSyncCache.updateObject(key, value));
        }
        return updateArray;
    }

    /**
     * Find and delete object on cache and set private attribute to show that it's not deleted online yet
     * If it's created only on cache, this method will simply delete the register on cache
     * Value must have a primaryKey to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<void>}
     */
    static async deleteObject (key: string, value: Object): Promise<void> {
        const item = await AMSyncCache.findObject(key, value);
        let data = {};
        if (item._cacheCreatedAt) {
            // It's created only on cache, can simply be deleted
            await AMSyncCache.storage.deleteItem(item);
            return;
        } else {
            // It's already created online, so need to delete online
            data = {
                ...value,
                _cacheCreatedAt: null,
                _cacheUpdatedAt: null,
                _cacheDeletedAt: new Date(),
                _needSync: true,
                updatedAt: new Date()
            };
        }
        // Merge cache item with new data and update on cache
        const newValue = AMSyncCache.toPlain({...item, ...data});
        await AMSyncCache.storage.updateItem(key, newValue);
    }

    /**
     * Update register on cache and set all cache dates as null
     * This means that the register is synced
     * Value must have a primaryKey to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async setValueAndCleanCacheData (key: string, value: Object): Promise<Object> {
        const item = await AMSyncCache.findObject(key, value);
        let data = {
            ...value,
            _cacheCreatedAt: null,
            _cacheUpdatedAt: null,
            _cacheDeletedAt: null,
            _needSync: false

        };
        // Merge cache item with new data and update on cache
        const newValue = AMSyncCache.toPlain({...item, ...data});
        const updated = await AMSyncCache.storage.updateItem(key, newValue);
        return AMSyncCache.toPlain(updated);
    }

    /**
     * Completely remove object fom cache
     * For sync-aware use the method "deleteObject"
     * Value must have a primaryKey to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<void>}
     */
    static async deleteFromCacheData (key: string, value: Object): Promise<void> {
        const item = await AMSyncCache.findObject(key, value);
        if (!item || Object.keys(item).length < 1) {
            throw new Error(`Object not found to delete on ${key}`);
        }
        await AMSyncCache.storage.deleteItem(item);
    }

    /**
     * Find object on cache and return it's instance
     * Value must have a primaryKey to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async findObject (key: string, value: Object): Promise<Object> {
        // Check if object can be found
        if (!value[AMSyncCache.primaryKey]) {
            throw new Error(`Object without ${AMSyncCache.primaryKey}. Unable to find it.`);
        }
        const notPlain = true; // Return instance
        let item = await AMSyncCache.getObject(key, value, notPlain);
        if (!item) {
            return {};
        }
        return item;
    }

    /**
     * Make instance a plain object
     * @param object
     * @returns {Object}
     */
    static toPlain (object: RealmObject): Object {
        return toPlainObject(object);
    }
}

// Default used primaryKey
AMSyncCache.primaryKey = '_id';

export default AMSyncCache;