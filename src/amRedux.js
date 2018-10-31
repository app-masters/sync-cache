// @flow
import cloneDeep from 'lodash/cloneDeep';
import update from 'immutability-helper';
import { ObjHandler } from '@app-masters/js-lib';
import { AMActions } from '@app-masters/redux-lib';
import AMSync from './amSync';
import type { SyncType } from './amSync';
import type { SyncConfig, Action } from './customTypes';

class AMRedux {
    // Static callbacks
    static actionConfig: { [key: string]: Object }; // Custom array of configs for each endpoint
    static actionTypes: { [key: string]: string }; // All possible dispatches for each endpoint
    static actions: { [key: string]: SyncType }; // Each key is a instance of a sync-cache with methods for each endpoint
    static reducers: { [key: string]: Function }; // List of reducers

    /**
     * Configuration of redux actions and reducers
     * @param configs
     */
    static setup (configs: Array<Object>): void {
        // Check configs
        if (!configs || !Array.isArray(configs) || configs.length < 0) {
            throw new Error('Invalid config array provided to AMRedux');
        }
        // Define default value for each endpoint
        configs.map(customConfig => {
            const reducerName = customConfig.name + 'Reducer';

            // Validating config
            if (!customConfig.name || customConfig.name.length < 1) {
                throw new Error('Invalid config provided, "name" is required');
            }

            // Merge default config values with the provided
            this.actionConfig[customConfig.name] = {
                ...this.getDefaultConfig(customConfig),
                ...customConfig,
                reducer: reducerName
            };

            // Create list of possible actions
            const typeName = customConfig.name.toUpperCase();
            actionSuffix.map((suffix: string) => {
                this.actionTypes[typeName + suffix] = typeName + suffix;
            });

            // Create a instance for this config
            if (this.actionConfig[customConfig.name].cacheStrategy) {
                this.actions[customConfig.name] = new AMSync(this.actionConfig[customConfig.name]);
            } else {
                this.actions[customConfig.name] = new AMActions(this.actionConfig[customConfig.name]);
            }

            // Create reducer methods for this config
            this.reducers[reducerName] = this.createReducer(customConfig);
        });

    }

    /**
     * Default config for sync
     * @param config
     * @returns SyncConfig
     */
    static getDefaultConfig (config: SyncConfig): SyncConfig {
        return {
            typePrefix: config.name.toUpperCase(),
            endPoint: '/' + config.name + '/',
            conflictRule: conflictRule,
            defaultSort: 'title', // Only for AMActions
            defaultPopulate: '', // Only for AMActions
            validateObject: () => null,
            singularTitle: 'none', // Only for AMActions
            pluralTitle: 'none', // Only for AMActions
            prepareToClient: (item: Object) => item,
            prepareToServer: (item: Object) => item,
            createSuffix: '',
            updateSuffix: '',
            deleteSuffix: '',
            primaryKey: '_id',
            cacheStrategy: null,
            relations: [],
            foreignField: []
        };
    }

    /**
     * Create reducer function for this config
     * @param config
     * @returns {Function}
     */
    static createReducer (config: SyncConfig): (state: Object, action: Action) => Object {
        const typeName = config.name.toUpperCase() + '_';
        // Default initial state for each reducer
        const INITIAL_STATE = {
            items: [],
            item: null,
            input: {},
            loading: false,
            loadingCache: false,
            loadingOnline: false,
            error: false,
            syncingCreate: false,
            syncingUpdate: false,
            syncingDelete: false,
            isSyncing: false,
            needSync: false
        };
        // Return default reducer dealing with default actions
        return (state = cloneDeep(INITIAL_STATE), action) => {
            // Match incoming action with correct reducer
            if (!action.type.startsWith(typeName)) {
                return state;
            }
            const actionType = action.type.replace(typeName, '');
            switch (actionType) {
            case 'LOADING':
                return {
                    ...state,
                    loading: action.payload
                };
            case 'ERROR':
                return {
                    ...state,
                    error: action.payload
                };
            case 'INPUT_CHANGED': {
                let obj = {};
                obj[action.payload.key] = action.payload.value;
                return update(state,
                    {input: {$merge: obj}}
                );
            }
            case 'GET_OBJECT':
                return {
                    ...state,
                    item: action.payload,
                    input: action.payload
                };
            case 'GET_OBJECTS':
                return {
                    ...state,
                    items: action.payload
                };
            case 'CREATE_OBJECT': {
                let {items} = state;
                items = ObjHandler.removeDuplicates([...items, action.payload], '_id');
                return {
                    ...state,
                    items,
                    input: {}
                };
            }
            case 'DELETE_OBJECT':
                return {
                    ...state,
                    items: state.items.filter(item => action.payload !== item._id)
                };
            case 'UPDATE_OBJECT': {
                let {items} = state;
                items = ObjHandler.removeDuplicates([action.payload, ...items], '_id');
                return {
                    ...state,
                    items,
                    input: {}
                };
            }
            case 'NEW_OBJECT':
                return ({...state, input: INITIAL_STATE.input});
            case 'LOADING_CACHE':
                return {
                    ...state,
                    loadingCache: action.payload
                };
            case 'LOADING_ONLINE':
                return {
                    ...state,
                    loadingOnline: action.payload
                };
            case 'SAVE_OBJECT':
                return state;
            case 'LOADING_SYNC':
                return {
                    ...state,
                    isSyncing: action.payload
                };
            case 'NEED_SYNC':
                return {
                    ...state,
                    needSync: action.payload
                };
            case 'LOADING_SYNC_CREATE':
                return {
                    ...state,
                    syncingCreate: action.payload
                };
            case 'LOADING_SYNC_UPDATE':
                return {
                    ...state,
                    syncingUpdate: action.payload
                };
            case 'LOADING_SYNC_DELETE':
                return {
                    ...state,
                    syncingDelete: action.payload
                };
            default:
                console.warn(`[AMRedux] Action type ${action.type} is not a valid case for ${typeName} reducer.`);
                return state;
            }
        };
    }
}

AMRedux.actionConfig = {};
AMRedux.actionTypes = {};
AMRedux.actions = {};
AMRedux.reducers = {};

// Each action type suffix
const actionSuffix = [
    '_CREATE_OBJECT',
    '_SAVE_OBJECT',
    '_NEW_OBJECT',
    '_UPDATE_OBJECT',
    '_DELETE_OBJECT',
    '_GET_OBJECT',
    '_GET_OBJECTS',
    '_INPUT_CHANGED',
    '_LOADING',
    '_ERROR',
    '_VALID',
    '_LOADING_CACHE',
    '_LOADING_ONLINE',
    '_LOADING_SYNC',
    '_NEED_SYNC',
    '_LOADING_SYNC_CREATE',
    '_LOADING_SYNC_UPDATE',
    '_LOADING_SYNC_DELETE'
];

// Default conflict rule, priories newest object
const conflictRule = (cacheObject, onlineObject) => {
    const dateCache = cacheObject.updatedAt ? new Date(cacheObject.updatedAt).getTime() : 0;
    const dateOnline = onlineObject.updatedAt ? new Date(onlineObject.updatedAt).getTime() : 0;
    if (dateCache < dateOnline) {
        return onlineObject;
    } else {
        return cacheObject;
    }
};

export default AMRedux;