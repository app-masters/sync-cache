// @flow

import toPlainObject from 'lodash/toPlainObject';
import type { Storage } from './customTypes';

class Cache {
    // Statics of Cache Class
    static storage: Storage; // Storage class
    static lastId: number; // Last saved cache Id number

    /**
     * Set the storage class used by the cache
     * @param storage
     */
    static setStorage (storage: Storage) {
        Cache.storage = storage;
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
            ...value,
            _cacheCreatedAt: new Date(),
            _cacheUpdatedAt: null,
            _cacheDeletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        if (!data._cacheId) {
            let cacheId = (new Date()).getTime();
            if (this.lastId) {
                cacheId = this.lastId + 1;
                this.lastId = cacheId;
            }
            data._cacheId = cacheId;
        }

        // Create object on cache and any class extras
        const item = await Cache.storage.createItem(key, data);
        return Cache.toPlain(item);
    }

    /**
     * Get first object on cache that match query object or match query string
     * If _id or _cacheId are on object, it will use them as index for the search
     * @param key - Must be a valid schema name
     * @param query {Object | string}
     * @param returnInstance [optional] - Return instance of the register (not a plain object)
     * @returns {Promise<*>}
     */
    static async getObject (key: string, query: { _id?: number, _cacheId?: number, [any]: any } | string, returnInstance: ?boolean): Promise<Object | null> {
        let item = null;
        if (query._id) {
            // Filter by _id
            item = await Cache.storage.getItems(key, {_id: query._id});
        } else if (query._cacheId) {
            // Filter by _cacheId
            item = await Cache.storage.getItems(key, {_cacheId: query._cacheId});
        } else {
            // Filter by another object or check string
            item = await Cache.storage.getItems(key, query);
        }
        // Don't return invalid
        if (item && item[0]) {
            if (returnInstance) {
                return item[0];
            } else {
                return Cache.toPlain(item[0]);
            }
        }
        return null;
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
            data = await Cache.storage.getItems(key, query);
        } else {
            data = await Cache.storage.getItems(key);
        }

        const items = [];
        // Verify if some object is found by the query
        if (data) {
            for (const item of data) {
                // Don't return invalid or already deleted items'
                if (item && !item._cacheDeletedAt) {
                    items.push(Cache.toPlain(item));
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
        const data = await Cache.storage.getItems(key, query);
        const items = [];
        // Verify if some object is found by the query
        if (data) {
            for (const item of data) {
                // Don't return invalid or already deleted items'
                if (item) {
                    items.push(Cache.toPlain(item));
                }
            }
        }
        return items;
    }

    /**
     * Find and update object on cache and set private attribute to show that it's not updated online yet
     * Value must have a _id or _cacheId to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async updateObject (key: string, value: { _id: ?number, _cacheId: ?number, $key: any }): Promise<Object> {
        let item = await Cache.findObject(key, value);
        let data = {};
        if (item._cacheCreatedAt) {
            // It's created only on Cache.storage, so don't need to update online
            data = {
                ...value,
                _cacheCreatedAt: new Date(),
                _cacheUpdatedAt: null,
                _cacheDeletedAt: null,
                updatedAt: new Date()

            };
        } else {
            // It's already created online, so need to update
            data = {
                ...value,
                _cacheCreatedAt: null,
                _cacheUpdatedAt: new Date(),
                _cacheDeletedAt: null,
                updatedAt: new Date()
            };
        }
        // Merge cache item with new data and update on cache
        const newValue = {...item, ...data};
        item = await Cache.storage.updateItem(key, newValue);
        return Cache.toPlain(item);
    }

    /**
     * Find and update each object on cache and set private attribute to show that it's not updated online yet
     * Each value on array must have a _id or _cacheId to be found
     * @param key - Must be a valid schema name
     * @param values
     * @returns {Promise<Array<Object>>}
     */
    static async updateObjects (key: string, values: Array<{ _id: ?number, _cacheId: ?number, $key: any }>): Promise<Array<Object>> {
        const updateArray = [];
        for (const value of values) {
            updateArray.push(Cache.updateObject(key, value));
        }
        return updateArray;
    }

    /**
     * Find and delete object on cache and set private attribute to show that it's not deleted online yet
     * If it's created only on cache, this method will simply delete the register on cache
     * Value must have a _id or _cacheId to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<void>}
     */
    static async deleteObject (key: string, value: Object): Promise<void> {
        const item = await Cache.findObject(key, value);
        let data = {};
        if (item._cacheCreatedAt) {
            // It's created only on cache, can simply be deleted
            await Cache.storage.deleteItem(item);
            return;
        } else {
            // It's already created online, so need to delete online
            data = {
                ...value,
                _cacheCreatedAt: null,
                _cacheUpdatedAt: null,
                _cacheDeletedAt: new Date(),
                updatedAt: new Date()
            };
        }
        // Merge cache item with new data and update on cache
        const newValue = {...item, ...data};
        await Cache.storage.updateItem(key, newValue);
    }

    /**
     * Update register on cache and set all cache dates as null
     * This means that the register is synced
     * Value must have a _id or _cacheId to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async setValueAndCleanCacheData (key: string, value: Object): Promise<Object> {
        const item = await Cache.findObject(key, value);
        let data = {
            ...value,
            _cacheCreatedAt: null,
            _cacheUpdatedAt: null,
            _cacheDeletedAt: null

        };
        // Merge cache item with new data and update on cache
        const newValue = {...item, ...data};
        const updated = await Cache.storage.updateItem(key, newValue);
        return Cache.toPlain(updated);
    }

    /**
     * Completely remove object fom cache
     * For sync-aware use the method "deleteObject"
     * Value must have a _id or _cacheId to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<void>}
     */
    static async deleteFromCacheData (key: string, value: Object): Promise<void> {
        const item = await Cache.findObject(key, value);
        await Cache.storage.deleteItem(item);
    }

    /**
     * Find object on cache and return it's instance
     * Value must have a _id or _cacheId to be found
     * @param key - Must be a valid schema name
     * @param value
     * @returns {Promise<Object>}
     */
    static async findObject (key: string, value: Object): Promise<Object> {
        // Check if object can be found
        if (!value._id && !value._cacheId) {
            throw new Error(`Object without _id and _cacheId. Unable to find it.`);
        }
        const notPlain = true; // Return instance
        let item = await Cache.getObject(key, value, notPlain);
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

export default Cache;