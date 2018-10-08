// @flow
import type { UserType } from './user';

const Repository = require('@app-masters/node-lib').repository;

class Users extends Repository<UserType> {

}

module.exports = Users;
