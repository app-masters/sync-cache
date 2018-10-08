if (process.env.NODE_ENV === 'test') {
    require('dotenv').config({path: '../.env'});
} else {
    require('dotenv').config();
}

let DATABASE = '';
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'CI') {
    if (!process.env.DATABASE_URL) {
        throw new Error('You must create a .env file with your personal heroku database url on DATABASE_URL');
    }
    DATABASE = process.env.DATABASE_URL;
}

const session = {
    active: false
};

const rollbar = {
    accessToken: '-',
    logOnDev: false
};



module.exports = {
    test: {
        rollbar,
        database: {
            url: DATABASE
        },
        security: {
            checkClientOnDev: false,
            secret: '6d717d8cd4fc71c6f3e8e2cc5b695eace7f372c1d8ae5ddb1bfcaacebf80f543'
        },
        moip: {},
        server: {
            corsOptions: {
                origin: '*',
                methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
                preflightContinue: false,
                optionsSuccessStatus: 204,
                exposedHeaders: 'api-version, api-env, min-web-version, min-mobile-version, min-admin-version, user',
                allowedHeaders: 'content-type, Authorization, authorization, client, client-env, admin-version, mobile-version, web-version'
            },
            initialize: {
                base: '/api',
                updateMethod: 'PUT'
            }
        }
    },
    development: {
        rollbar,
        database: {
            url: DATABASE,
            forceSync: false
        },
        security: {
            checkClientOnDev: false,
            secret: '6d717d8cd4fc71c6f3e8e2cc5b695eace7f372c1d8ae5ddb1bfcaacebf80f543'
        },
        moip: {        },
        server: {
            corsOptions: {
                origin: '*',
                methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
                preflightContinue: false,
                optionsSuccessStatus: 204,
                exposedHeaders: 'api-version, api-env, min-web-version, min-mobile-version, min-admin-version, user',
                allowedHeaders: 'content-type, Authorization, authorization, client, client-env, admin-version, mobile-version, web-version'
            },
            initialize: {
                base: '/api',
                updateMethod: 'PUT'
            }
        },
        session
    },
    production: {
        rollbar,
        security: {
            checkClientOnDev: false,
            secret: '6d717d8cd4fc71c6f3e8e2cc5b695eace7f372c1d8ae5ddb1bfcaacebf80f543'
        },
        moip: {},
        server: {
            corsOptions: {
                origin: '*',
                methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
                preflightContinue: false,
                optionsSuccessStatus: 204,
                exposedHeaders: 'api-version, api-env, min-web-version, min-mobile-version, min-admin-version, user',
                allowedHeaders: 'content-type, Authorization, authorization, client, client-env, admin-version, mobile-version, web-version'
            },
            initialize: {
                base: '/api',
                updateMethod: 'PUT'
            }
        },
        session
    },
    CI: {
        rollbar,
        database: {
            url: '-'
        },
        security: {
            checkClientOnDev: false,
            secret: '6d717d8cd4fc71c6f3e8e2cc5b695eace7f372c1d8ae5ddb1bfcaacebf80f543'
        },
        server: {
            corsOptions: {
                origin: '*',
                methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
                preflightContinue: false,
                optionsSuccessStatus: 204,
                exposedHeaders: 'api-version, api-env, min-web-version, min-mobile-version, min-admin-version, user',
                allowedHeaders: 'content-type, Authorization, authorization, client, client-env, admin-version, mobile-version, web-version'
            },
            initialize: {
                base: '/api',
                updateMethod: 'PUT'
            }
        },
        moip: {},
        session
    }
};
