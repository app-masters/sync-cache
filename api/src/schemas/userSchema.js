const Auth = require('@app-masters/node-lib').auth;

const {STRING, DATE, INTEGER} = require('sequelize');

const {Users, User} = require('../model');

const schema = {
    _id: {type: INTEGER, primaryKey: true, autoIncrement: true},
    localEmail: {
        type: STRING,
        allowNull: false,
        field: 'local_email',
        validate: {
            isEmail: true
        }
    },
    localPassword: {type: STRING, allowNull: true, field: 'local_password'},
    role: {type: STRING},
    name: {type: STRING, allowNull: true},
    createdAt: {type: DATE, field: 'created_at'},
    updatedAt: {type: DATE, field: 'updated_at'},
    deletedAt: {type: DATE, field: 'deleted_at'},
};

Users.setup('users', schema, User, {
    freezeTableName: true,
    deletedAt: 'deletedAt',
    paranoid: true
});

Auth.setUserModel(Users);

module.exports = Users.getModel();
