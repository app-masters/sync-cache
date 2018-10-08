const path = require('path');

module.exports = {
    module: {
        rules: [{
            oneOf: [
                // Process JS with Babel.
                {
                    test: /\.(js|jsx|mjs)$/,
                    loader: require.resolve('babel-loader'),
                    options: {
                        // This is a feature of `babel-loader` for webpack (not Babel itself).
                        // It enables caching results in ./node_modules/.cache/babel-loader/
                        // directory for faster rebuilds.
                        cacheDirectory: true,
                    }
                },
                // "url" loader works like "file" loader except that it embeds assets
                // smaller than specified limit in bytes as data URLs to avoid requests.
                // A missing `test` is equivalent to a match.
                {
                    test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
                    loader: require.resolve('url-loader'),
                    options: {
                        limit: 10000,
                        name: 'static/media/[name].[hash:8].[ext]'
                    }
                },
                // "file" loader makes sure those assets get served by WebpackDevServer.
                // When you `import` an asset, you get its (virtual) filename.
                // In production, they would get copied to the `build` folder.
                // This loader doesn't use a "test" so it will catch all modules
                // that fall through the other loaders.
                {
                    // Exclude `js` files to keep "css" loader working as it injects
                    // its runtime that would otherwise processed through "file" loader.
                    // Also exclude `html` and `json` extensions so they get processed
                    // by webpacks internal loaders.
                    exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
                    loader: require.resolve('file-loader'),
                    options: {
                        name: 'static/media/[name].[hash:8].[ext]'
                    }
                }
            ]
        }]
    },
};
