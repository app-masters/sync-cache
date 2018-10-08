let Server = {clients: []};
const ws = require('ws');
Server = new ws.Server({port: '3030'});
Server.broadcast = function broadcast (data) {
    Server.clients.forEach(function each (client) {
        if (client.readyState === 1) {
            client.send(data);
        }
    });
};
Server.on('connection', client => {
    client.on('message', (data) => {
        Server.broadcast('refresh');
    });
});
var nodemon = require('nodemon');

nodemon('--watch build --exec "node ./build/bundle.js"');
