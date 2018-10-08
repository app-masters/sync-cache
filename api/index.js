process._debugProcess(process.pid);
const compression = require('compression');

// Requires for bootstrap
process._debugProcess(process.pid);
// import 'babel-polyfill';

const envs = require('./src/config');
const packag = require('./package.json');
const app = require('@app-masters/node-lib').express(envs[process.env.NODE_ENV || 'development']);
const apiBootstrap = require('@app-masters/node-lib').apiBootstrapS;

// 1 - Api Bootstrap tests
app.use(compression());
apiBootstrap.setup(app, envs, packag);

// 2 - Include Routes
const newApp = require('./src/routes')(app, envs[process.env.NODE_ENV]);

// 3 - Listen API
apiBootstrap.listen(Object.assign(app, newApp));
