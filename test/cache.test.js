import { RealmStorage } from '@app-masters/realm-async-storage';
import AMCache from '../src/cache';

const userSchema = {
    name: 'user',
    primaryKey: '_id',
    properties: {
        _id: 'int?',
        name: 'string?',
        createdAt: 'date?',
        updatedAt: 'date?',
        deletedAt: 'date?',

        _needSync: 'bool?',
        _cacheCreatedAt: 'date?',
        _cacheUpdatedAt: 'date?',
        _cacheDeletedAt: 'date?'
    }
};

let testUser = {
    name: 'Baraky'
};

describe('AMSyncCache test', () => {
    it('Storage setup', async () => {
        await RealmStorage.setup([userSchema]);
        expect(RealmStorage.getModel()).not.toBe(null);
    });

    it('Storage setup', async () => {
        AMCache.setStorage(RealmStorage);
        expect(AMCache.storage).not.toBe(null);
    });

    it('Create object', async () => {
        const user = await AMCache.createObject('user', testUser);
        expect(user).toBeDefined();
        expect(user._id).toBeDefined();
        expect(user.name).toBe(testUser.name);
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        expect(user._cacheCreatedAt).toBeDefined();
    });

    it('Get objects', async () => {
        const users = await AMCache.getObjects('user');
        expect(users).toBeDefined();
        expect(users[0]).toBeDefined();
        expect(users[0].name).toBe(testUser.name);
        expect(users[0].createdAt).toBeDefined();
        expect(users[0].updatedAt).toBeDefined();
        testUser = users[0];
    });

    it('Get objects filtered', async () => {
        const users = await AMCache.getObjects('user', {_id: testUser._id});
        expect(users).toBeDefined();
        expect(users[0]).toBeDefined();
        expect(users[0].name).toBe(testUser.name);
        expect(users[0].createdAt).toBeDefined();
        expect(users[0].updatedAt).toBeDefined();
    });

    it('Get object', async () => {
        const user = await AMCache.getObject('user', {_id: testUser._id});
        expect(user).toBeDefined();
        expect(user.name).toBe(testUser.name);
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
    });

    it('Update object', async () => {
        const user = await AMCache.updateObject('user', {_id: testUser._id, name: 'Tortilha'});
        expect(user).toBeDefined();
        expect(user.name).not.toBe(testUser.name);
        expect(user.name).toBe('Tortilha');
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
    });

    it('Delete object', async () => {
        await AMCache.deleteObject('user', {_id: testUser._id});
        const user = await AMCache.getObject('user', {_id: testUser._id});
        expect(user).toEqual({});
    });

    it('Delete all', async () => {
        await RealmStorage.removeAll();
        const users = await RealmStorage.getItems('user');
        expect(Object.keys(users)).toEqual([]);
    });
});