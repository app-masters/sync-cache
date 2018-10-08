const Schemas = require('../schemas');
const Middlewares = require('./middlewares');
const finaleResources = {
    Users: {
        schema: Schemas.UserSchema,
        restMiddleware: Middlewares.UsersMiddleware
    }
};

module.exports = finaleResources;
