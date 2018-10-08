const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base');
const webpackNodeExternalsJS = require('webpack-node-externals');
const webpack = require('webpack');
const dotenv = require('dotenv');
dotenv.config();
const config = (env) => {
    let localEnv = 'development';
    if (env && env.NODE_ENV) {
        localEnv = env.NODE_ENV;
    }

    const dev = (localEnv === 'development');
    const definePluginConfig = new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(localEnv),
        'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL),
        'process.env': {
            'NODE_ENV': JSON.stringify(localEnv),
            'DATABASE_URL': JSON.stringify(process.env.DATABASE_URL)
        }
    });
    return {
        target: 'node',
        entry: ['babel-polyfill', './index.js'],
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'build')
        },
        externals: [webpackNodeExternalsJS()],
        devtool: (dev ? 'eval-source-map' : 'source-map'),
        plugins: [definePluginConfig]
    };
};

module.exports = (env) => merge(baseConfig, config(env));
