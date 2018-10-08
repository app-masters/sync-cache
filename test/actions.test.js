import Sync from '../src/synchronization';
import { Http } from '@app-masters/js-lib';
import fetch from 'node-fetch';
import { store, listener } from './redux/store';
import ACTIONS from './redux/actions/types';
import Cache from '../src/cache';
import Storage from '../src/realmStorage';
import { userReduxConfig, userCacheSchema } from './config';

let UserActions = null;
jest.setTimeout(10000);

describe('Sync test', () => {
    it('Storage setup', async () => {
        await Storage.setup([userCacheSchema]);
        expect(Storage.getModel()).not.toBe(null);
    });

    it('Cache setup', async () => {
        Cache.setStorage(Storage);
        expect(Cache.storage).not.toBe(null);
    });

    it('Sync setup', async () => {
        UserActions = new Sync(userReduxConfig);
        expect(UserActions).toMatchSnapshot();

        const baseUrl = 'http://localhost:3000/api';
        Http.setup('1.0.0', 'web', 'test', 'application/json');
        Http.setBaseURL(baseUrl);
        Http.setFetch(fetch);
        expect(Http.baseURL).toBe(baseUrl);
    });

    it('Redux setup', async () => {
        expect(store).not.toBe(null);
        expect(store.getState()).toMatchSnapshot();
    });

    it('Get users', async (finish) => {
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

    it('First user creation', async (finish) => {
        expect.assertions(12);
        UserActions.createObject({
            name: 'Baraky',
            role: 'admin',
            localEmail: 'valid@email.com',
            localPassword: 'validPassword'
        })(store.dispatch);
        let firstTime = true;
        listener.on(ACTIONS.USER_CREATE_OBJECT, ({payload}) => {
            if (firstTime) {
                firstTime = false;
                expect(payload).toBeDefined();
                expect(payload._id).toBeNull();
                expect(payload._cacheId).toBeDefined();
                expect(payload._cacheCreatedAt).toBeDefined();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
            } else {
                expect(payload).toBeDefined();
                expect(payload._id).toBeDefined();
                expect(payload._cacheId).toBeDefined();
                expect(payload._cacheCreatedAt).toBeNull();
                expect(payload._cacheUpdatedAt).toBeNull();
                expect(payload._cacheDeletedAt).toBeNull();
                listener.removeAllListeners(ACTIONS.USER_CREATE_OBJECT);
                finish();
            }
        });
    });
});