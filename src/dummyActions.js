import { Http } from '@app-masters/js-lib';
import AMCache from './cache';

class AMCacheActions {

    validateSetup = () => {
        if (AMCacheActions.onUncaught === null) {
            throw new Error('You must call AMActions.setup first. Please, read the readme at redux-lib.');
        }
    };

    //// GENERIC METHOS to work for all promisses and possibilities here

    // 1 - CacheOnline - Obter do cache, depois online
    // 2 - Cache - Obter do cache apenas
    // 3 - CacheEmptyOnline - Obter do cache, se não tiver cache, obter online
    // 4 - Online - Obter online apenas

    doSave = (cacheStrategy, alwaysReturn, promiseCache, promiseOnline) => {
        console.log('doSave', cacheStrategy);
        if (cacheStrategy === 'CacheOnline' || cacheStrategy === 'CacheEmptyOnline') {
            this.doSaveCacheOnline(alwaysReturn, promiseCache, promiseOnline);
        } else if (cacheStrategy === 'Cache') {
            this.doSaveCache(alwaysReturn, promiseCache);
        } else if (cacheStrategy === 'Online') {
            this.doSaveOnline(alwaysReturn, promiseOnline);
        }
    };

    // 1 - CacheOnline - Obter do cache, depois online
    doSaveCacheOnline = (alwaysReturn, promiseCache, promiseOnline) => {
        // console.log("doSaveCacheOnline");
        promiseCache().then(result => {
            // console.log('1result', result);
            alwaysReturn(result, true);
            if (promiseOnline) {
                promiseOnline().then(result => {
                    // console.log('2result', result);
                    alwaysReturn(result, false, true);
                });
            } else {
                // console.log('2result', result);
                alwaysReturn(result, true, true);
            }
        }).catch(err => {
            this.onUncaught(err);
        });
    };

    // 2 - Cache - Obter do cache apenas
    doSaveCache = (alwaysReturn, promiseCache) => {
        // console.log("doSaveCache");
        promiseCache().then(result => {
            alwaysReturn(result, true, true);
        }).catch(err => {
            this.onUncaught(err);
        });
    };

    // 4 - Online - Salvar online apenas
    doSaveOnline = (alwaysReturn, promiseOnline) => {
        // console.log("doSaveOnline");
        promiseOnline().then(result => {
            alwaysReturn(result, false, true);
        }).catch(err => {
            this.onUncaught(err);
        });
    };

    // 1 - CacheOnline - Obter do cache, depois online
    // 2 - Cache - Obter do cache apenas
    // 3 - CacheEmptyOnline - Obter do cache, se não tiver cache, obter online
    // 4 - Online - Obter online apenas

    doGet = (cacheStrategy, alwaysReturn, promiseOnline, promiseCache) => {
        this.validateSetup();
        // console.log("doGet", cacheStrategy);
        if (cacheStrategy === 'CacheOnline') {
            this.doGetCacheOnline(alwaysReturn, promiseOnline, promiseCache);
        } else if (cacheStrategy === 'Cache') {
            this.doGetCache(alwaysReturn, promiseCache);
        } else if (cacheStrategy === 'CacheEmptyOnline') {
            this.doGetCacheEmptyOnline(alwaysReturn, promiseOnline, promiseCache);
        } else if (cacheStrategy === 'Online') {
            this.doGetOnline(alwaysReturn, promiseOnline);
        }

        // doIfCache(sempreRetornar, promessaCacheInativo, promessaCacheAtivo);
        //
    };

// 1 - CacheOnline - Obter do cache, depois online
    doGetCacheOnline = (alwaysReturn, promiseOnline, promiseCache) => {
        this.validateSetup();
        // console.log("doGetCacheOnline");
        promiseCache().then(result => {
            // console.log('promiseCache result', result);
            if (result && result.length > 0) {
                // result.pop(); //
                // result.shift(); //
            }
            alwaysReturn(result, true, false);
            // setTimeout(() => {
            promiseOnline().then(result => {
                alwaysReturn(result, false, true);
            });
            // }, 3000);
        }).catch(err => {
            this.onUncaught(err);
        });
    };

    doGetCache = (alwaysReturn, promiseCache) => {
        this.validateSetup();
        // console.log("doGetCache");
        promiseCache().then(result => {
            console.log('promiseCache result', result);
            this._countFakeRecords(result);
            alwaysReturn(result, true, true);
        }).catch(err => {
            this.onUncaught(err);
        });
    };

    _countFakeRecords (records) {
        // count fake records
        this.syncRecords = [];
        // console.log("fakesCount", fakesCount);
        if (!records) {
            this.syncRecordsCount = 0;
        } else {
            this.syncRecordsCount = records.reduce((count, record) => {
                // console.log(record);
                // console.log(record._id);
                if (record && record._id && record._id.indexOf('fake') > -1) {
                    this.syncRecords.push(record);
                    return count + 1;
                } else
                    return count;
            }, 0);
            return this.syncRecordsCount;
        }
    }

    doGetCacheEmptyOnline = (alwaysReturn, promiseOnline, promiseCache) => {
        this.validateSetup();
        // console.log("doGetCacheEmptyOnline");
        promiseCache().then(result => {
            // console.log('promiseCache result', result);
            // result = null; //
            alwaysReturn(result, true, false);
            if (!result || result.length === 0) {
                // setTimeout(() => {
                promiseOnline().then(result => {
                    alwaysReturn(result, false, true);
                });
                // }, 1000);
            }
        }).catch(err => {
            this.onUncaught(err);
        });
    };
    doGetOnline = (alwaysReturn, promiseOnline) => {
        this.validateSetup();
        // console.log("doGetOnline");
        promiseOnline().then(result => {
            alwaysReturn(result, false, true);
        }).catch(err => {
            this.onUncaught(err);
        });
    };

    // cache ok
    getObjects = (sort, populate, filter) => {

        return (dispatch) => {
            try {
                this.setLoading(dispatch, true, this.config.cacheStrategy !== 'Online', this.config.cacheStrategy !== 'Cache');
                this.setError(dispatch, null);

                //console.log("ok");
                // Everymotherfuckercase
                let sempreRetornar = (response, fromCache, final) => {
                    if (final === true)
                        this.setLoading(dispatch, false, false, false);
                    else if (fromCache === true)
                        this.setLoadingFrom(dispatch, 'CACHE', false);
                    else if (fromCache === false)
                        this.setLoadingFrom(dispatch, 'ONLINE', false);
                    else
                        console.log('from where??');
                    // console.log("getObjects.sempreRetornar");

                    // When using cache, always SHOW cache data, even when getting from API first
                    const persistCache = !this.config.persistCache && this.config.cacheStrategy === 'CacheOnline'; // Cache is the truth
                    let replaceAll = fromCache === false && !filter && persistCache;

                    this.dispatchGetObjects(dispatch, response, replaceAll, filter);
                };
                let promessaCache = () => {
                    // console.log("getObjects.promessaCache");
                    this.setLoadingFrom(dispatch, 'CACHE', true);
                    return AMCache.getObjects(this.config.typePrefix);
                };
                let promessaOnline = () => {
                    // console.log("getObjects.promessaOnline");
                    this.setLoadingFrom(dispatch, 'ONLINE', true);
                    return this._getObjects(sort, populate, filter);
                };

                this.doGet(this.config.cacheStrategy, sempreRetornar, promessaOnline, promessaCache);
            } catch (err) {
                this.onUncaught(err);
            }
        };
    };

    dispatchGetObjects(dispatch, response, replaceAll, filter) {
        // console.log('fromCache',fromCache);
        // console.log('filter',filter);
        if (Object.prototype.toString.call(response) === '[object Array]')
            response = response.map(item => this.prepareToClient(item));
        else
            response = []; //
        // When Online, always use API data
        if (this.config.cacheStrategy === 'Online') {
            // console.log('dispatchGetObjects', 'Online');
            dispatch({type: this.type('GET_OBJECTS'), payload: response});
            // this.setLoading(dispatch, false);
        } else {
            // console.log('dispatchGetObjects', 'else');

            // let replaceAll = true;
            AMCache.addObjects(this.config.typePrefix, response, replaceAll).then(response => {
                dispatch({type: this.type('GET_OBJECTS'), payload: response});
                // this.setLoading(dispatch, false);
            });
        }
    }

    _getObjects (sort, populate, filter) {
        let url = this.config.endPoint;
        sort = (sort ? sort : this.config.defaultSort);
        populate = (populate ? populate : this.config.defaultPopulate);
        url += '?sort=' + sort;
        if (populate) {
            url += '&populate=' + populate;
        }
        if (filter)
            url += '&' + filter;
        return Http.get(url);
    }

    /* GET OBJECTS */

    getObject = (id, populate) => {
        return (dispatch) => {
            try {
                this.setLoading(dispatch, true, this.config.cacheStrategy !== 'Online', this.config.cacheStrategy !== 'Cache');
                this.setError(dispatch, null);
                dispatch({type: this.type('NEW_OBJECT'), payload: {}});

                // Everymotherfuckercase
                let sempreRetornar = (response, fromCache, final) => {
                    if (final === true)
                        this.setLoading(dispatch, false, false, false);
                    else if (fromCache === true)
                        this.setLoadingFrom(dispatch, 'CACHE', false);
                    else if (fromCache === false)
                        this.setLoadingFrom(dispatch, 'ONLINE', false);
                    else
                        console.log('from where??');

                    //console.log("getObject.sempreRetornar");
                    this.dispatchGetObject(dispatch, response, fromCache);
                };
                let promessaCacheAtivo = () => {
                    // console.log("getObject.promessaCacheAtivo");
                    this.setLoadingFrom(dispatch, 'CACHE', true);
                    return AMCache.getObject(this.config.typePrefix, id);
                };
                let promessaCacheInativo = () => {
                    // console.log("getObject.promessaCacheInativo");
                    this.setLoadingFrom(dispatch, 'ONLINE', true);
                    return this._getObject(id, populate);
                };

                this.doGet(this.config.cacheStrategy, sempreRetornar, promessaCacheInativo, promessaCacheAtivo);
            } catch (err) {
                this.onUncaught(err);
            }
        };

    };

    _getObject (id, populate) {
        let url = this.config.endPoint + id;
        if (populate !== false) {
            populate = (populate ? populate : this.config.defaultPopulate);
            url += '?populate=' + populate;
        }
        return Http.get(url);
    }

    dispatchGetObject (dispatch, response, fromCache) {
        // console.log('aa',Object.prototype.toString.call(response));
        if (Object.prototype.toString.call(response) === '[object Object]')
            response = this.prepareToClient(response);
        else
            response = {};
        if (this.config.cacheStrategy === 'Online') {
            // console.log('dispatchGetObject', 'Online');
            dispatch({type: this.type('GET_OBJECT'), payload: response});
            this.setLoading(dispatch, false);
        }
        else {
            AMCache.addObjects(this.config.typePrefix, [response]);
            dispatch({type: this.type('GET_OBJECT'), payload: response});
            // console.log('dispatch', response);
            this.setLoading(dispatch, false);
        }
    }

    saveObject = (input, justCache) => {
        let error = this._validateObject(input);
        if (error)
            return (dispatch) => {
                return {type: this.type('VALID'), payload: {message: error}};
            };

        // console.log('saveObject', input);
        if (input._id) {
            return this.updateObject(input, justCache);
        } else {
            return this.createObject(input, justCache);
        }
    };

    saveObjectCache = (input) => {
        return this.saveObject(input, true);
    };

    newObject = (dispatch) => {
        return (dispatch) => {
            this.setLoading(dispatch, false, false, false);
            this.setError(dispatch, null);
            dispatch({type: this.type('NEW_OBJECT'), payload: {}});
        };
    };

    prepareForm = (match) => {
        // console.log('match', match);
        if (match && match.params.id !== 'new') {
            // Editing
            return this.getObject(match.params.id, false);
        } else {
            // Inserting
            return this.newObject();
        }
    };

    createObject = (input, justCache) => {
        return (dispatch) => {

            try {
                input = this.prepareToServer(input);

                this.setLoading(dispatch, true, this.config.cacheStrategy !== 'Online', this.config.cacheStrategy !== 'Cache');
                this.setError(dispatch, null);

                // Everymotherfuckercase
                let sempreRetornar = (response, fromCache, final) => {
                    if (final === true)
                        this.setLoading(dispatch, false, false, false);
                    else if (fromCache === true)
                        this.setLoadingFrom(dispatch, 'CACHE', false);
                    else if (fromCache === false)
                        this.setLoadingFrom(dispatch, 'ONLINE', false);
                    else
                        console.log('from where??');

                    this.dispatchSaveObject(dispatch, response, 'CREATE_OBJECT');
                };
                let promessaCache = () => {
                    this.setLoadingFrom(dispatch, 'CACHE', true);
                    return AMCache.addObjects(this.config.typePrefix, [input]);
                };
                let promessaOnline = () => {
                    this.setLoadingFrom(dispatch, 'ONLINE', true);
                    delete input['_id'];
                    return this._createObject(input);
                };

                if (justCache)
                    promessaOnline = null;

                this.doSave(this.config.cacheStrategy, sempreRetornar, promessaCache, promessaOnline);
            } catch (err) {
                this.onUncaught(err);
            }
        };
    };

    _createObject = (input) => {
        const sufix = this.config.createSufix || '';
        return Http.post(this.config.endPoint + sufix, input);
    };

    /* UPDATE */

    updateObject = (input, justCache) => {
        // console.log('updateObject ' + input);
        return (dispatch) => {

            try {
                let id = input._id;
                input = this.prepareToServer(input);

                this.setLoading(dispatch, true, this.config.cacheStrategy !== 'Online', this.config.cacheStrategy !== 'Cache');
                this.setError(dispatch, null);

                // Everymotherfuckercase
                let sempreRetornar = (response, fromCache, final) => {
                    if (final === true)
                        this.setLoading(dispatch, false, false, false);
                    else if (fromCache === true)
                        this.setLoadingFrom(dispatch, 'CACHE', false);
                    else if (fromCache === false)
                        this.setLoadingFrom(dispatch, 'ONLINE', false);
                    else
                        console.log('from where??');

                    // console.log("updateObject.sempreRetornar");
                    this.dispatchSaveObject(dispatch, response, 'UPDATE_OBJECT');
                };
                let promessaCache = () => {
                    // console.log("updateObject.promessaCache", input);
                    this.setLoadingFrom(dispatch, 'CACHE', true);
                    return AMCache.addObjects(this.config.typePrefix, [input]);
                };
                let promessaOnline = () => {
                    // console.log("pupdateObject.romessaOnline");
                    delete input['_id'];
                    this.setLoadingFrom(dispatch, 'ONLINE', true);
                    return this._updateObject(id, input);
                };

                if (justCache)
                    promessaOnline = null;

                this.doSave(this.config.cacheStrategy, sempreRetornar, promessaCache, promessaOnline);
            } catch (err) {
                this.onUncaught(err);
            }
        };
    };

    _updateObject (id, input) {
        const sufix = this.config.updateSufix || '';
        return Http.put(this.config.endPoint + id + sufix, input);
    }

    dispatchSaveObject (dispatch, response, secondaryAction) {
        dispatch({type: this.type(secondaryAction), payload: this.prepareToClient(response)}); // broadcast
        dispatch({type: this.type('SAVE_OBJECT'), payload: this.prepareToClient(response)});
        this.setLoading(dispatch, false);
    }

    /* DELETE */

    deleteObject = (id) => {
        return (dispatch) => {

            try {
                this.setLoading(dispatch, true, this.config.cacheStrategy !== 'Online', this.config.cacheStrategy !== 'Cache');
                this.setError(dispatch, null);

                // Everymotherfuckercase
                let sempreRetornar = (response, fromCache, final) => {
                    if (final === true)
                        this.setLoading(dispatch, false, false, false);
                    else if (fromCache === true)
                        this.setLoadingFrom(dispatch, 'CACHE', false);
                    else if (fromCache === false)
                        this.setLoadingFrom(dispatch, 'ONLINE', false);
                    else
                        console.log('from where??');

                    // console.log("updateObject.sempreRetornar");
                    this._dispatchDeleteObject(dispatch, id);
                };
                let promessaCache = () => {
                    // console.log("updateObject.promessaCache");
                    this.setLoadingFrom(dispatch, 'CACHE', true);
                    return AMCache.delObjects(this.config.typePrefix, [id]);
                };
                let promessaOnline = () => {
                    // console.log("pupdateObject.romessaOnline");
                    this.setLoadingFrom(dispatch, 'ONLINE', true);
                    return this._deleteObject(id);
                };

                if (id.indexOf("fake") > -1)
                    promessaOnline = null;

                this.doSave(this.config.cacheStrategy, sempreRetornar, promessaCache, promessaOnline);
            } catch (error) {
                this.onUncaught(err);
                this.setError(dispatch, error);
            }
        };
    };

    deleteSyncData = () => {
        return (dispatch) => {

            try {
                this.setLoading(dispatch, true, this.config.cacheStrategy !== 'Online', this.config.cacheStrategy !== 'Cache');
                this.setError(dispatch, null);

                // Get fake ids
                let syncRecords = this.getSyncData();
                let ids = [];
                for (let record of syncRecords) {
                    console.log(record);
                    ids.push(record._id);
                }
                console.log(ids);

                // Everymotherfuckercase
                let sempreRetornar = (response, fromCache, final) => {
                    if (final === true)
                        this.setLoading(dispatch, false, false, false);
                    else if (fromCache === true)
                        this.setLoadingFrom(dispatch, 'CACHE', false);
                    else if (fromCache === false)
                        this.setLoadingFrom(dispatch, 'ONLINE', false);
                    else
                        console.log('from where??');

                    this.syncRecords = [];
                    this.syncRecordsCount = 0;

                    // console.log("updateObject.sempreRetornar");
                    this._dispatchDeleteObject(dispatch, ids);
                };
                let promessaCache = () => {
                    // console.log("updateObject.promessaCache");
                    this.setLoadingFrom(dispatch, 'CACHE', true);
                    return AMCache.delObjects(this.config.typePrefix, ids);
                };

                this.doSave(this.config.cacheStrategy, sempreRetornar, promessaCache, null);
            } catch (error) {
                this.onUncaught(err);
                this.setError(dispatch, error);
            }
        };
    };

    _deleteObject (id) {
        const sufix = this.config.deleteSufix || '';
        return Http.delete(this.config.endPoint + id + sufix);
    }

    _dispatchDeleteObject (dispatch, id) {
        console.log('constructorName', id.constructor.name);
        if (id.constructor.name === 'Array') {
            id.map(oId => {
                dispatch({type: this.type('DELETE_OBJECT'), payload: oId});
            });
        } else {
            dispatch({type: this.type('DELETE_OBJECT'), payload: id});
        }

    }

    resetObjects = () => {
        return (dispatch) => {
            dispatch({type: this.type('GET_OBJECTS'), payload: []})
        };
    };

    hasSyncData = async () => {
        // Duplicated code from "promessaCache" on getObjects
        let records = await AMCache.getObjects(this.config.typePrefix);
        this._countFakeRecords(records);
        return this.getCountSyncData() > 0;
    };

    getCountSyncData = () => {
        return this.syncRecordsCount;
    };

    getSyncData = () => {
        return this.syncRecords;
    };

    // clearSyncData = async () => {
    //     let syncRecords = this.getSyncData();
    //     let ids = [];
    //     for (let record of syncRecords) {
    //         console.log(record);
    //         ids.push(record._id);
    //     }
    //     console.log(ids);
    //     let ok = await AMCache.delObjects(this.config.typePrefix, ids);
    //     console.log(ok);
    // }

    /// UncaughtError handlers

    static onUncaughtError (cbUncaughtError) {
        AMCacheActions.onUncaught = cbUncaughtError;
    }

    onUncaught = (error) => {
        if (AMCacheActions.onUncaught) {
            AMCacheActions.onUncaught(error);
        } else {
            console.warn('!!! onError not setted on AMActions !!!');
            console.log(error);
        }
        console.error(error);
    };

}

AMCacheActions.onUncaught = null;

export default AMCacheActions;