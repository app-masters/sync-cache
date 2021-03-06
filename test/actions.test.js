import Sync from '../src/amSync';
import { Http } from '@app-masters/js-lib';
import fetch from 'node-fetch';
import Chance from 'chance';
import { store, listener } from './redux/store';
import ACTIONS from './redux/actions/types';
import AMCache from '../src/cache';
import { RealmStorage } from '@app-masters/realm-async-storage';
import { userReduxConfig, userCacheSchema } from './config';

const chance = new Chance();

let UserActions = null;
jest.setTimeout(10000);

let testUser = {};

describe('Sync test', () => {
    it('Storage setup', async () => {
        await RealmStorage.setup([userCacheSchema]);
        expect(RealmStorage.getModel()).not.toBe(null);
    });

    it('AMSyncCache setup', async () => {
        AMCache.setStorage(RealmStorage);
        expect(AMCache.storage).not.toBe(null);
    });

    it('Redux setup', async () => {
        expect(store).not.toBe(null);
        expect(store.getState()).toMatchSnapshot();
    });

    it('[ONLINE] Sync setup', async () => {
        UserActions = new Sync(userReduxConfig);
        expect(UserActions).toMatchSnapshot();

        const baseUrl = 'http://localhost:3000/api';
        Http.setup('1.0.0', 'web', 'test', 'application/json');
        Http.setBaseURL(baseUrl);
        Http.setFetch(fetch);
        expect(Http.baseURL).toBe(baseUrl);
    });
    it('[ONLINE] Get users', async (finish) => {
        expect.assertions(2);
        UserActions.getObjects()(store.dispatch);
        let firstTime = true;
        listener.on(ACTIONS.USER_GET_OBJECTS, ({payload}) => {
            if (firstTime) {
                firstTime = false;
                expect(payload).toBeDefined();
            } else {
                expect(payload).toBeDefined();
                listener.removeAllListeners(ACTIONS.USER_CREATE_OBJECT);
                finish();
            }
        });
    });

    it('[ONLINE] Create user', async (finish) => {
        expect.assertions(10);
        UserActions.createObject({
            name: chance.first(),
            role: 'admin',
            localEmail: chance.email(),
            localPassword: 'validPassword'
        })(store.dispatch);
        let firstTime = true;
        listener.on(ACTIONS.USER_CREATE_OBJECT, ({payload}) => {
            if (firstTime) {
                firstTime = false;
                expect(payload).toBeDefined();
                expect(payload._id).toBeDefined();
                expect(payload._cacheCreatedAt).toBeDefined();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
            } else {
                expect(payload).toBeDefined();
                expect(payload._id).toBeDefined();
                expect(payload._cacheCreatedAt).toBeNull();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
                testUser = payload;
                listener.removeAllListeners(ACTIONS.USER_CREATE_OBJECT);
                finish();
            }
        });
    });

    it('[ONLINE] Get user', async (finish) => {
        expect.assertions(10);
        UserActions.getObject(testUser._id)(store.dispatch);
        let firstTime = true;
        listener.on(ACTIONS.USER_GET_OBJECT, ({payload}) => {
            if (firstTime) {
                firstTime = false;
                expect(payload).toBeDefined();
                expect(payload._id).toBe(testUser._id);
                expect(payload._cacheCreatedAt).toBeNull();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
            } else {
                expect(payload).toBeDefined();
                expect(payload._id).toBe(testUser._id);
                expect(payload._cacheCreatedAt).toBeNull();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
                listener.removeAllListeners(ACTIONS.USER_GET_OBJECT);
                finish();
            }
        });
    });

    it('[ONLINE] Update user', async (finish) => {
        expect.assertions(14);
        const role = 'user';
        const fullName = `${chance.prefix()} ${chance.first()} ${chance.last()}`;
        testUser.role = role;
        testUser.name = fullName;
        UserActions.updateObject(testUser)(store.dispatch);
        let firstTime = true;
        listener.on(ACTIONS.USER_UPDATE_OBJECT, ({payload}) => {
            if (firstTime) {
                firstTime = false;
                expect(payload).toBeDefined();
                expect(payload.role).toBe(role);
                expect(payload.name).toBe(fullName);
                expect(payload._id).toBeDefined();
                expect(payload._cacheCreatedAt).toBeNull();
                expect(payload._cacheUpdatedAt).toBeDefined();
                expect(payload._cacheDeletedAt).toBeNull();
            } else {
                expect(payload).toBeDefined();
                expect(payload.role).toBe(role);
                expect(payload.name).toBe(fullName);
                expect(payload._id).toBeDefined();
                expect(payload._cacheCreatedAt).toBeNull();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
                listener.removeAllListeners(ACTIONS.USER_UPDATE_OBJECT);
                finish();
            }
        });
    });

    it('[ONLINE] Delete user', async (finish) => {
        expect.assertions(2);
        UserActions.deleteObject(testUser)(store.dispatch);
        let firstTime = true;
        listener.on(ACTIONS.USER_DELETE_OBJECT, ({payload}) => {
            if (firstTime) {
                firstTime = false;
                expect(payload).toBeDefined();
            } else {
                expect(payload).toBeDefined();
                listener.removeAllListeners(ACTIONS.USER_DELETE_OBJECT);
                finish();
            }
        });
    });

    // OFFLINE
    it('[OFFLINE] Sync setup', async () => {
        const baseUrl = 'http://localhost:3001/api';
        Http.setBaseURL(baseUrl);
        expect(Http.baseURL).toBe(baseUrl);
    });

    it('[OFFLINE] Get users', async (finish) => {
        expect.assertions(2);
        UserActions.getObjects()(store.dispatch);
        listener.on(ACTIONS.USER_GET_OBJECTS, ({payload}) => {
            expect(payload).toBeDefined();
            listener.removeAllListeners(ACTIONS.USER_GET_OBJECTS);
            finish();
        });
    });

    it('[OFFLINE] Create user', async (finish) => {
        expect.assertions(5);
        UserActions.createObject({
            name: chance.first(),
            role: 'admin',
            localEmail: chance.email(),
            localPassword: 'validPassword'
        })(store.dispatch);
        listener.on(ACTIONS.USER_CREATE_OBJECT, ({payload}) => {
            expect(payload).toBeDefined();
            expect(payload._id).toBeDefined();
            expect(payload._cacheCreatedAt).toBeDefined();
            expect(payload._cacheUpdatedAt).toBeNull();
            expect(payload._cacheDeletedAt).toBeNull();
            testUser = payload;
            listener.removeAllListeners(ACTIONS.USER_CREATE_OBJECT);
            finish();
        });
    });

    it('[OFFLINE] Get user', async (finish) => {
        expect.assertions(5);
        UserActions.getObject(testUser._id)(store.dispatch);
        listener.on(ACTIONS.USER_GET_OBJECT, ({payload}) => {
            expect(payload).toBeDefined();
            expect(payload._id).toBe(testUser._id);
            expect(payload._cacheCreatedAt).toBeDefined();
            expect(payload._cacheUpdatedAt).toBeNull();
            expect(payload._cacheDeletedAt).toBeNull();
            listener.removeAllListeners(ACTIONS.USER_GET_OBJECT);
            finish();
        });
    });

    it('[OFFLINE] Update user', async (finish) => {
        expect.assertions(7);
        const role = 'user';
        const fullName = `${chance.prefix()} ${chance.first()} ${chance.last()}`;
        testUser.role = role;
        testUser.name = fullName;
        UserActions.updateObject(testUser)(store.dispatch);
        listener.on(ACTIONS.USER_UPDATE_OBJECT, ({payload}) => {
            expect(payload).toBeDefined();
            expect(payload.role).toBe(role);
            expect(payload.name).toBe(fullName);
            expect(payload._id).toBeDefined();
            expect(payload._cacheCreatedAt).toBeDefined();
            expect(payload._cacheUpdatedAt).toBeNull();
            expect(payload._cacheDeletedAt).toBeNull();
            listener.removeAllListeners(ACTIONS.USER_UPDATE_OBJECT);
            finish();
        });
    });

    it('[OFFLINE] Delete user', async (finish) => {
        expect.assertions(1);
        console.log(testUser);
        UserActions.deleteObject(testUser)(store.dispatch);
        listener.on(ACTIONS.USER_DELETE_OBJECT, ({payload}) => {
            expect(payload).toBeDefined();
            listener.removeAllListeners(ACTIONS.USER_DELETE_OBJECT);
            finish();
        });
    });
    const testNumber = 10;
    it(`[OFFLINE] Create ${testNumber} users`, async (finish) => {
        expect.assertions(testNumber);
        let successCount = 0;
        listener.on(ACTIONS.USER_CREATE_OBJECT, ({payload}) => {
            expect(payload).toBeDefined();
            successCount++;
            if (successCount === testNumber) {
                listener.removeAllListeners(ACTIONS.USER_CREATE_OBJECT);
                finish();
            }
        });
        for (let index of Array.from(Array(testNumber), (_, i) => i + 1)) {
            UserActions.createObject({
                name: `${chance.prefix()} ${chance.first()} ${chance.last()}`,
                role: 'admin',
                localEmail: chance.email(),
                localPassword: 'validPassword'
            })(store.dispatch);
        }
    });

    it(`[OFFLINE] ${testNumber} users to sync`, async () => {
        const usersToCreate = await UserActions.getObjectsToCreate();
        expect(usersToCreate).toBeDefined();
        expect(usersToCreate).toHaveLength(testNumber);
    });

    it(`[ONLINE] Sync ${testNumber} users`, async () => {
        const baseUrl = 'http://localhost:3000/api';
        Http.setBaseURL(baseUrl);
        const createdUsers = await UserActions.syncCreatedObjects();
        expect(createdUsers).toBeDefined();
        expect(createdUsers).toHaveLength(testNumber);
    });

});