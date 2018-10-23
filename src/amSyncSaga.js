// @flow

import { all, put, takeLatest, spawn, select, call, takeEvery } from 'redux-saga/effects';
import AMRedux from './amRedux';
import type { SyncConfig } from './customTypes';

/**
 * Check if something has the configuration for cache sync and is not already syncing
 * @returns {IterableIterator<ForkEffect>}
 * @constructor
 */
function* CHECK_SYNC () {
    yield takeLatest(ACTIONS.CHECK_SYNC, function* () {
        try {
            // Wait 500ms before sync again
            yield call(() => new Promise(resolve => setTimeout(() => resolve(true), 500)));
            const syncConfigs = AMRedux.actionConfig;

            for (const config of syncConfigs) {
                // Only try to sync if strategy has cache
                if (config.cacheStrategy.indexOf('Cache') < 0) {
                    continue;
                }

                // Check if already syncing
                const {isSyncing} = yield select(state => state[config.reducer]);
                if (isSyncing) {
                    continue;
                }

                // Find unsync data for each
                yield put({type: ACTIONS.FIND_UNSYNC, payload: config});
            }
            // Waiting 1 minute before trying to sync again
            yield call(() => new Promise(resolve => setTimeout(() => resolve(true), 60000)));
            yield put({type: ACTIONS.CHECK_SYNC});
        } catch (error) {
            console.warn('CHECK_SYNC FAIL > ', error);
        }
    });
}

/**
 * Find if each table has unsynced data and call the specific method
 * @returns {IterableIterator<*|ForkEffect>}
 * @constructor
 */
function* FIND_UNSYNC () {
    yield takeEvery(ACTIONS.FIND_UNSYNC, function* (action: { type: string, payload: SyncConfig }) {
        try {
            const config = action.payload;
            const syncActions = AMRedux.actions[config.name];

            // Reset loadings
            yield put({type: ACTIONS.RESET_SYNC_STATE, payload: config});

            // Find unsynchronized created objects
            const unsyncCreated = yield syncActions.getObjectsToCreate();
            if (unsyncCreated && unsyncCreated.length > 0) {
                yield put({type: ACTIONS.SYNC_CREATE, payload: config});
            }
            // Find unsynchronized updated objects
            const unsyncUpdated = yield syncActions.getObjectsToUpdate();
            if (unsyncUpdated && unsyncUpdated.length > 0) {
                yield put({type: ACTIONS.SYNC_UPDATE, payload: config);
            }
            // Find unsynchronized deleted objects
            const unsyncDeleted = yield syncActions.getObjectsToDelete();
            if (unsyncDeleted && unsyncDeleted.length > 0) {
                yield put({type: ACTIONS.SYNC_DELETE, payload: config});
            }
        } catch (error) {
            console.warn('FIND_UNSYNC FAIL > ', error);
        }
    });
}

/**
 * Create online objects that are only created on cache
 * @returns {IterableIterator<*|ForkEffect>}
 * @constructor
 */
function* SYNC_CREATE () {
    yield takeEvery(ACTIONS.SYNC_CREATE, function* (action: { type: string, payload: SyncConfig }) {
        try {
            // Sync all objects created only on cache
            const config = action.payload;
            const actionTypes = AMRedux.actionTypes[config.name];
            const syncActions = AMRedux.actions[config.name];
            const typePrefix = config.name.toUpperCase();

            // Set loading as true
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC'], payload: true});
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_CREATE'], payload: true});

            // Sync objects
            yield syncActions.syncCreatedObjects();

            // Set loading false
            yield put({type: ACTIONS.FINISHED_SYNC_STATE, payload: {method: 'CREATE', config}});
        } catch (error) {
            console.warn('SYNC_CREATE FAIL > ', error);
        }
    });
}

/**
 * Update online objects that are only updated on cache
 * @returns {IterableIterator<*|ForkEffect>}
 * @constructor
 */
function* SYNC_UPDATE () {
    yield takeEvery(ACTIONS.SYNC_UPDATE, function* (action: { type: string, payload: SyncConfig }) {
        try {
            // Sync all objects created only on cache
            const config = action.payload;
            const actionTypes = AMRedux.actionTypes[config.name];
            const syncActions = AMRedux.actions[config.name];
            const typePrefix = config.name.toUpperCase();

            // Set loading as true
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC'], payload: true});
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_UPDATE'], payload: true});

            // Sync objects
            yield syncActions.syncUpdatedObjects();

            // Set loading false
            yield put({type: ACTIONS.FINISHED_SYNC_STATE, payload: {method: 'UPDATE', config}});
        } catch (error) {
            console.warn('SYNC_UPDATE FAIL > ', error);
        }
    });
}

/**
 * Delete online objects that are only deleted on cache
 * @returns {IterableIterator<*|ForkEffect>}
 * @constructor
 */
function* SYNC_DELETE () {
    yield takeEvery(ACTIONS.SYNC_DELETE, function* (action: { type: string, payload: SyncConfig }) {
        try {
            // Sync all objects created only on cache
            const config = action.payload;
            const actionTypes = AMRedux.actionTypes[config.name];
            const syncActions = AMRedux.actions[config.name];
            const typePrefix = config.name.toUpperCase();

            // Set loading as true
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC'], payload: true});
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_DELETE'], payload: true});

            // Sync objects
            yield syncActions.syncDeletedObjects();

            // Set loading false
            yield put({type: ACTIONS.FINISHED_SYNC_STATE, payload: {method: 'DELETE', config}});
        } catch (error) {
            console.warn('SYNC_DELETE FAIL > ', error);
        }
    });
}

/**
 * Set all loadings to false - Initial state
 * @returns {IterableIterator<*|ForkEffect>}
 * @constructor
 */
function* RESET_SYNC_STATE () {
    yield takeEvery(ACTIONS.RESET_SYNC_STATE, function* (action: { type: string, payload: SyncConfig }) {
        try {
            // Set all sync loadings to false
            const config = action.payload;
            const actionTypes = AMRedux.actionTypes[config.name];
            const typePrefix = config.name.toUpperCase();
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC'], payload: false});
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_CREATE'], payload: false});
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_UPDATE'], payload: false});
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_DELETE'], payload: false});
        } catch (error) {
            console.warn('RESET_SYNC_STATE FAIL > ', error);
        }
    });
}

/**
 * Set specific loading to false and general loading to false when all the loadings finish
 * @returns {IterableIterator<*|ForkEffect>}
 * @constructor
 */
function* FINISHED_SYNC_STATE () {
    yield takeEvery(ACTIONS.FINISHED_SYNC_STATE, function* (action: { type: string, payload: { config: SyncConfig, method: string } }) {
        try {
            // Set all sync loadings to false
            const {config, method} = action.payload;
            const actionTypes = AMRedux.actionTypes[config.name];
            const typePrefix = config.name.toUpperCase();

            // Set method loading as false
            yield put({type: actionTypes[typePrefix + '_LOADING_SYNC_' + method], payload: false});

            // Check if something else is loading, if not, set loadingCache as false
            const {syncingCreate, syncingUpdate, syncingDelete} = yield select(state => state[config.reducer]);
            if (!syncingCreate && !syncingUpdate && !syncingDelete) {
                yield put({type: actionTypes[typePrefix + '_LOADING_SYNC'], payload: false});
            }
        } catch (error) {
            console.warn('RESET_SYNC_STATE FAIL > ', error);
        }
    });
}

// Possible saga actions
const ACTIONS = {
    CHECK_SYNC: 'AM_SYNC_SAGA/CHECK_SYNC',
    FIND_UNSYNC: 'FIND_UNSYNC',
    SYNC_CACHE: 'SYNC_CACHE',
    RESET_SYNC_STATE: 'RESET_SYNC_STATE',
    SYNC_CREATE: 'SYNC_CREATE',
    SYNC_UPDATE: 'SYNC_UPDATE',
    SYNC_DELETE: 'SYNC_DELETE',
    FINISHED_SYNC_STATE: 'FINISHED_SYNC_STATE'
};

// Action for start synchronization process
const syncObjects = (dispatch) => {
    dispatch({type: ACTIONS.CHECK_SYNC});
};
export { syncObjects };

// Spawn all sagas
export default function* syncSaga () {
    yield all([
        spawn(CHECK_SYNC),
        spawn(FIND_UNSYNC),
        spawn(RESET_SYNC_STATE),
        spawn(FINISHED_SYNC_STATE),
        spawn(SYNC_CREATE),
        spawn(SYNC_UPDATE),
        spawn(SYNC_DELETE)
    ]);
}