let clearCache = () => {};
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'CI' ) {
    clearCache = require('../../app/helpers/cacheRenderer').clearCache;
}
module.exports = {clearCache};
