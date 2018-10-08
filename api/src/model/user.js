// @flow
const Instance = require('@app-masters/node-lib').instance;
const Users = require('./users');
const Text = require('@app-masters/js-lib').Text;

type userParams = $Exact<{ // eslint-disable-line
    _id: number,
    name: string,
    localEmail: string,
    localPassword: string,
    role: string
}>

interface Indexable { // eslint-disable-line
    [key: string]: any;
}

class User extends Instance {
    $key: any;
    $value: any;
    _id: number;
    name: string;
    localEmail: string;
    localPassword: string;
    role: string;
    _firstName: string;
    _nameSurname: string;

    constructor (obj: Object) {
        super(obj, Users);
        if (obj && obj.name) {
            this._firstName = obj.name.split(' ')[0];
            this._nameSurname = Text.nameSurname(obj.name);
        }
    }
}

export type UserType = User;
module.exports = User;
