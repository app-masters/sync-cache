const express = require('express');
const router = express.Router();
const sslRedirect = require('heroku-ssl-redirect');

const {sequelizeInstance} = require('@app-masters/node-lib');
const finaleRestful = require('@app-masters/node-lib').finaleRestful;
const schemas = require('../resources/index');
module.exports = (app, configs) => {
    app.use(sslRedirect(['production']));
    app.use('/api', router);

    // Schema routes
    finaleRestful.registerMultipleRoutes(app, schemas, sequelizeInstance.getInstance(), configs);

};
