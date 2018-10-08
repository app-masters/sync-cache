const {development, CI} = require('./src/config');

module.exports = {
    CI: {
        client: 'pg',
        connection: CI.database.url,
        migrations: {
            directory: './migrations/'
        }
    },
    development: {
        client: 'pg',
        connection: development.database.url,
        migrations: {
            directory: './migrations/'
        }
    },
    staging: {
        migrations: {
            directory: './migrations/'
        },
        client: 'pg',
        connection: process.env.DATABASE_URL
    },
    production: {
        migrations: {
            directory: './migrations/'
        },
        client: 'pg',
        connection: process.env.DATABASE_URL

    }

};
