
var players = [];
var food = [];

function Player(x, y, mass, name, color, id) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.color = color;
}

function Food(x, y, color){
    this.x = x;
    this.y = y;
    this.color = color;
}

var express = require('express');
var socket = require('socket.io');

var app = express();
var server = app.listen(8888);
app.use(express.static('public'));

var io = socket(server);
io.on('connection', newConnection); //io.on == io.sockets.on
io.on('disconnect', closeConnection);

function createWorld(){
    //create random food position
    for(i = 0; i < 1000; i++){
        food.push(random(-1000,1000),random(-1000,1000));
    }
    //set constrain

    //set lobby name
}

function newConnection(socket){
    console.log('User ' + socket.id + ' connected');

    socket.on('start', start);
    socket.on('move', move);
    socket.on('die', die);

    function start(data) {
        console.log(socket.id + " " + data.x + " " + data.y + " " + data.name + " "+ data.mass + " " + data.color);
        //send other players to client
        socket.emit('start', players);

        var player = new Player(data.x, data.y, data.mass, data.name, data.color, socket.id);
        players.push(player);
        //send new player to all other clients
        //emit = all clients, broadcast = all other, exept sender
        socket.broadcast.emit('newPlayer', player);
    }

    function move(data) {
        //console.log(socket.id + " " + data.x + " " + data.y + " " + data.mass);
        data.id = socket.id;
        for (var i = 0; i < players.length; i++) {
          if (players[i].id == data.id) {
            players[i].x = data.x;
            players[i].y = data.y;
            players[i].mass = data.mass;
            break;
          }
        }
        socket.broadcast.emit('update', data);
    }

    function die(data) {
        for(i = 0; i < players.length; i++){
            var other = players[i];
            if(player.eat(other)){
                world.removeChild(other);
                players.splice(i,1);
            }
        }
        socket.broadcast.emit('deadPlayer', data);
    }
}

function closeConnection(){
    console.log('User ' + socket.id + ' disconnected');

    //delete player cell or call funny self destruct method
    //...
}

console.log('Server is running...');
