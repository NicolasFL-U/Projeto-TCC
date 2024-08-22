require('dotenv').config();

const express = require('express');
const session = require('express-session');

const path = require('path');
const routes = require('./routes/routes');

const app = express();

// Configurações da sessão
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Configurações do express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Usar as rotas definidas
app.use(routes);

// Procedimentos pré-inicialização


app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});