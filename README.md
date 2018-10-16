# Sync Cache

## Description
Classes for deal with local persistence of data and online synchronization
Sync deals with external API and duplicate the data to redux store. 
At the same time, can have unsynchronized data on local storage.

## Getting started
On the `App.js`, import and give desired model list to setup./
```javascript
import { AmSync, AmSyncCache } from '@app-masters/sync-cache';
...
// Custom conflict rule (Priories newest object)
const conflictRule = (cacheObject, onlineObject) => {
    const dateCache = new Date(cacheObject.updatedAt).getDate();
    const dateOnline = new Date(onlineObject.updatedAt).getDate();
    if (dateCache < dateOnline) {
        return onlineObject;
    } else {
        return cacheObject;
    }
};

// Default config for USER actions
const userReduxConfig = {
    validateObject: () => {}, // required
    prepareToServer: (item) => item,
    prepareToClient: (item) => item,
    conflictRule: conflictRule,
    typePrefix: 'USER', // required
    endPoint: '/users/', // required
    cacheStrategy: 'CacheOnline',
    createSuffix: '',
    updateSuffix: '',
    deleteSuffix: '',
    primaryKey: '_id'
};

AmSyncCache.setStorage(storage); // using @app-masters/realm-async-storage
const UserActions = new AmSync(userReduxConfig); 
````

Most of the methods are called by redux as `redux-thunk` actions.

#### Actions - Same as AmActions
- createObject
- updateObject
- deleteObject
- getObject
- getObjects

#### SyncActions
For synchonization, some methods are available on each instance, not requiring to be called as a redux action.
- syncCreatedObjects - find items with `_cacheCreatedAt` and sync it with API
- syncUpdatedObjects - find items with `_cacheUpdatedAt` and sync it with API
- syncDeletedObjects - find items with `_cacheDeletedAt` and sync it with API

## Tests
For running the tests, you can run a local API for integration tests. 
On another CLI, make API available on port 3000 with running the script:

````
$ cd api
$ npm run dev

````
