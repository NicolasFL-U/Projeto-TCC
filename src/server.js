const express = require('express');

const path = require('path');
const routes = require('./routes/routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'views')));
app.use(routes);

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});