const express = require('express');
const router = express.Router();
const auth = require('@app-masters/node-lib').auth;
const Users = require('../model/users');

let subRouter = express.Router({mergeParams: true});

router.use('/:id', auth.requireAuth);

router.use('/:id', async (req, res, next) => {
    if (req.params.id !== 'null' && req.params.id !== 'undefined') {
        req.user = await Users.findOne(req.params.id);
    } else {
        req.user = null;
    }
    next();
});
router.use('/:id', subRouter);

module.exports = {router};
