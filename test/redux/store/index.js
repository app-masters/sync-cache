import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import EventEmitter from 'events';
import listen from 'redux-action-listeners';

import reducers from '../reducers/userReducer';

class ActionEmitter extends EventEmitter {
    constructor (...args) {
        super(...args);
        this.types = 'all';
    }

    handleAction (action, dispatched, store) {
        this.emit(action.type, action, store);
        return dispatched;
    }
}

const objListener = new ActionEmitter();
let middleware = [];
middleware.push(thunk);

const store = compose(applyMiddleware(...middleware, listen(objListener)))(createStore)(reducers);

exports.store = store;
exports.listener = objListener;