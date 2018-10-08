
exports.up = function (knex) {
    return knex.schema.createTable('users', t => {
        t.increments('_id').primary();
        t.string('name', 255);
        t.string('local_email', 255).notNull();
        t.string('local_password', 255).notNull();
        t.string('role', 255).notNull().default('user');

        t.datetime('created_at').default(knex.raw('now()'));
        t.datetime('updated_at').default(knex.raw('now()'));
        t.datetime('deleted_at').default(null);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('users', t => {
        t.dropPrimary('_id');
    });
};
