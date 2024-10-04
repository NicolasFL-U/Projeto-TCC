require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const routes = require('./routes/routes');

const app = express();
const http = require('http');
const server = http.createServer(app); // Criando o servidor HTTP
const socketIo = require('socket.io');
const io = socketIo(server); // Integrando o Socket.io com o servidor HTTP

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

// Integrando Socket.io para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // Cliente entra em uma sala específica baseada no VOD
    socket.on('joinVodRoom', (vodId) => {
        console.log(`Cliente ${socket.id} entrou na sala VOD: ${vodId}`);
        socket.join(vodId); // Cliente ingressa na sala da VOD
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Exportando o io para ser usado nos controladores
module.exports.io = io;

// Iniciar o servidor com Socket.io
server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
