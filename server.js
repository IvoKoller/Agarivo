
var players = [];

function Player(id, x, y, radius, color){
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
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

    //set constrain

    //set lobby name
}




function newConnection(socket){
    console.log('User ' + socket.id + ' connected');

    socket.on('start', start);
    socket.on('update',update);

    function start(data) {
        //console.log(socket.id + " " + data.x + " " + data.y + " " + data.radius + " " + data.color);
        var player = new Player(socket.id, data.x, data.y, data.radius, data.color);
        players.push(player);
    }

    function update(data) {
        //console.log(socket.id + " " + data.x + " " + data.y + " " + data.r);
        var player;
        for (var i = 0; i < players.length; i++) {
          if (socket.id == players[i].id) {
            player = players[i];
          }
        }
        player.x = data.x;
        player.y = data.y;
        player.radius = data.radius;
        player.color = data.color;
      }

        socket.broadcast.emit('move', data); //broadcast recieved data to clients
    }
}

function closeConnection(){
    console.log('User ' + socket.id + ' disconnected');

    //delete player cell or call funny self destruct method
}

console.log('Server is running...');
