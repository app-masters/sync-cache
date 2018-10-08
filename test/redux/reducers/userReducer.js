import _ from 'lodash';
import update from 'immutability-helper';
import { ObjHandler } from '@app-masters/js-lib';

const INITIAL_STATE = {
    items: [],
    item: null,
    input: {},
    loading: false,
    loadingCache: false,
    loadingOnline: false,
    error: false
};

const typeName = 'USER_';

export default (state = _.cloneDeep(INITIAL_STATE), action) => {
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
    case 'CREATE_OBJECT':
        let {items} = state;
        items = ObjHandler.removeDuplicates([...items, action.payload], '_id');
        return {
            ...state,
            items,
            input: {}
        };
    case 'DELETE_OBJECT':
        return {
            ...state,
            items: state.items.filter(item => action.payload !== item._id)
        };
    case 'UPDATE_OBJECT':
        let obj = {};
        obj[action.payload.id] = action.payload;
        return update(state,
            {items: {$merge: obj}, input: {}}
        );
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
    default:
        console.warn('The type "' + action.type + '" don\'t have a valid case.');
        return state;
    }
};
