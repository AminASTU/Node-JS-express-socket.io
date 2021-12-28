var User = require("../Messenger/user.js");
var MsgOnClient = require("../Messenger/message.js");
var Private = require("../Messenger/private.js");
var uuid = require("../Messenger/node_modules/uuid");

var express = require("express");   // подключение модуля express
const { stringify } = require("querystring");
var app = express();                // app - создание программы
//app.use(express.static('resources'));
app.use(express.static(__dirname + '/resources'));
var server = require('http').createServer(app); // подключаем http, создаем сервер
var io = require('socket.io')(server);   // подключаем socket.io. Отслеживаем наш сервер

var User = require('./user');   // подключение user
const { setPriority } = require("os");


server.listen(3000); // отслеживаем порт 3000
/*server.listen(1337, '192.168.1.63', async function(){
    console.log("Подключение сервера");
});*/
/* выводим главную страницу при запуске */
app.get('/', function(request, response){
    response.sendFile(__dirname + "/pages/chat.html");   // отправляем файл chat.html при запуске
});

var users = new Map();
var story = new Map();
privates = []; // лс
online = [];   // онлайн челы
let count = 0;

// Обновление ника в общем списке
const updateNick = (username) => {
    
};

// Если такая приватная комната уже создана
const findPrivateRoom = (id) => {
    for (let item of privates) {
        if (item.id == id)
            return item;
    }
    return null;
};

// Поиск приватной комнаты по двум собеседникам
const findPrivateRoomById = (first, second) => {
    for (let item of privates) {
        if ((item.firstID == first && item.secondID == second) || (item.secondID == first && item.firstID == second))
            return item;
    }
    return null;
}
story.set("general", []);

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
        
        idRoom = findPrivateRoom(room);
        // Если подкл не в приватную комнату
        if (idRoom != null && idRoom.firstID != socket.id && idRoom.secondID != socket.id) {return;}    

        socket.removeAllListeners('msg-room');
        socket.join(room);
        socket.emit('new-chat');

        if(!story.get(room)) {  // Если клиент заходит в уже сущ. комнату ему показывается история смс
            story.set(room, []);
        }
        else{
            if(story.get(room) != null){
                for (const item of story.get(room)) {
                    socket.emit('add-msg', item);
                }
            }
        }

        socket.on('msg-room', function(Msg){    // смс в комнату
            var user = users.get(socket.id);
            var onClient = new MsgOnClient(Msg.time, Msg.content, user);
            console.log("Комната: " + room + " Время: ", onClient.time, " смс: ", onClient.content, " пользователь: ", onClient.User.name);
            if(story.get(room) != null){
                story.get(room).push(onClient);
            }
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
        });
    });

    socket.on('update-users',()=>{
        online = [];
        for (let item of users.keys()) {
            online.push(new User(item, users.get(item).name));
        }
        io.emit('list-users', online);
    });

    socket.on('private-room', (firstId) =>{
        let idRoom;
        let room = findPrivateRoomById(firstId, socket.id);
        if (room == null) {
            idRoom = uuid.v4();
            while (story.has(idRoom) || findPrivateRoom(idRoom) != null) {
                idRoom = uuid.v4();
            }
            privates.push(new Private(idRoom, firstId, socket.id));
        }
        else {
            idRoom = room.id;
        }
        io.sockets.emit('create-room', idRoom);
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