const bindAuth = middleware => {
    return middleware;
};

module.exports = {
    UsersMiddleware: (require('./UserMiddleware'))
};
