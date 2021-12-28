var User = require("../Messenger/user.js");
var MsgOnClient = require("../Messenger/message.js");

var express = require("express");   // подключение модуля express
const { stringify } = require("querystring");
var app = express();                // app - создание программы
//app.use(express.static('resources'));
app.use(express.static(__dirname + '/resources'));
var server = require('http').createServer(app); // подключаем http, создаем сервер
var io = require('socket.io')(server);   // подключаем socket.io. Отслеживаем наш сервер

var User = require('./user');   // подключение user


server.listen(3000); // отслеживаем порт 3000
/*server.listen(1337, '192.168.1.63', async function(){
    console.log("Подключение сервера");
});*/
/* выводим главную страницу при запуске */
app.get('/', function(request, response){
    response.sendFile(__dirname + "/pages/chat.html");   // отправляем файл index.html при запуске
});
app.get('/pages/group.html', function(request, response){
    response.sendFile(__dirname + "/pages/group.html"); 
});
app.get('/pages/personal.html', function(request, response){
    response.sendFile(__dirname + "/pages/personal.html"); 
});

var users = new Map();

online = [];   // онлайн челы
let count = 0;

 /* при подключении (событие) */
io.sockets.on('connection', async (socket) => {
    console.log("Присоединился:", socket.id);
    users.set(socket.id, new User(socket.id, "guest" + count++));
    online = [];
    for (let item of users.keys()) {
        
        online.push(new User(item, users.get(item).name));
    }
    io.emit('list-users', online);

    socket.on('join-room', function(room){    // событие входа в комнату
        socket.join(room);

        socket.on('msg-room', function(Msg){    // смс в комнату
            var user = users.get(socket.id);
            var onClient = new MsgOnClient(Msg.time, Msg.content, user);
            console.log("Комната: " + room + " Время: ", onClient.time, " смс: ", onClient.content, " пользователь: ", onClient.User.name);
            io.to(room).emit('add-msg', onClient);
        });

        socket.on('update-name-inroom', (username) => {
            var user = users.get(socket.id);
            if(user){   
                console.log("Пользователь:", socket.id, " поменял никнейм на: ", username);
                io.to(room).emit('new-nick', {user: user, newName: username});
                user.name = username;
            }  
        });

        socket.on('leave-room', () =>{
            socket.leave(room);
            socket.removeAllListeners('msg-room');
        });
    });
    
    socket.on('get-users', () =>{
        names = [];
        id = []
        for(let item of users.keys()){
            names.push(users.get(item).name);
            id.push(item);
        }
        io.sockets.emit('set-users', {names: names, id: id});
    });
    
    socket.on('disconnect', () => {
        var user = users.get(socket.id);
        if(user){
            users.delete(socket.id);
            console.log("Отсоединился:", socket.id);
            online = [];
            for (let item of users.keys()) {
                online.push(new User(item, users.get(item).name));
            }
            io.emit('list-users', online);
        }  
    });

});