require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const connect = () => {
    return new Promise((resolve, reject) => {
        pool.connect((err, client, done) => {
            if (err) reject(err);
            resolve({client, done});
        });
    });
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect,
    pool
};