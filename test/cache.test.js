import Storage from '../src/realmStorage';
import Cache from '../src/cache';

const userSchema = {
    name: 'user',
    primaryKey: '_cacheId',
    properties: {
        _id: 'int?',
        name: 'string?',
        createdAt: 'date?',
        updatedAt: 'date?',

        _cacheCreatedAt: 'date?',
        _cacheUpdatedAt: 'date?',
        _cacheDeletedAt: 'date?',
        _cacheId: 'int'
    }
};

let testUser = {
    name: 'Baraky',
    _cacheId: 1
};

describe('Cache test', () => {
    it('Storage setup', async () => {
        await Storage.setup([userSchema]);
        expect(Storage.getModel()).not.toBe(null);
    });

    it('Storage setup', async () => {
        Cache.setStorage(Storage);
        expect(Cache.storage).not.toBe(null);
    });

    it('Create object', async () => {
        const user = await Cache.createObject('user', testUser);
        expect(user).toBeDefined();
        expect(user.name).toBe(testUser.name);
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        expect(user._cacheId).toBeDefined();
        expect(user._cacheCreatedAt).toBeDefined();
    });

    it('Get objects', async () => {
        const users = await Cache.getObjects('user');
        expect(users).toBeDefined();
        expect(users[0]).toBeDefined();
        expect(users[0].name).toBe(testUser.name);
        expect(users[0].createdAt).toBeDefined();
        expect(users[0].updatedAt).toBeDefined();
        expect(users[0]._cacheId).toBeDefined();
    });

    it('Get objects filtered', async () => {
        const users = await Cache.getObjects('user', {_cacheId: 1});
        expect(users).toBeDefined();
        expect(users[0]).toBeDefined();
        expect(users[0].name).toBe(testUser.name);
        expect(users[0].createdAt).toBeDefined();
        expect(users[0].updatedAt).toBeDefined();
        expect(users[0]._cacheId).toBeDefined();
    });

    it('Get object', async () => {
        const user = await Cache.getObject('user', {_cacheId: 1});
        expect(user).toBeDefined();
        expect(user.name).toBe(testUser.name);
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        expect(user._cacheId).toBeDefined();
    });

    it('Update object', async () => {
        const user = await Cache.updateObject('user', {_cacheId: 1, name: 'Tortilha'});
        expect(user).toBeDefined();
        expect(user.name).not.toBe(testUser.name);
        expect(user.name).toBe('Tortilha');
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        expect(user._cacheId).toBeDefined();
    });

    it('Delete object', async () => {
        await Cache.deleteObject('user', {_cacheId: 1});
        const user = await Cache.getObject('user', {_cacheId: 1});
        expect(user).toBeNull();
    });

    it('Delete all', async () => {
        await Storage.removeAll();
        const users = await Storage.getItems('user');
        expect(Object.keys(users)).toEqual([]);
    });
});