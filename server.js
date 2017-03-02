/*
    Name: Agarivo
    Version: 0.0.1 (25.2.2017)
    Author: Ivo Koller
    License: MIT
    Description: This file is responsible for the behaviour of the server.
    It sets up a http-fileserver listening on the specified port using express.js
    and passes it on to the socket.io package which is used for communcating
    between the client and the server.
    Upon starting the server, a new world is created with the specified variables
    (worldX, worldY, foodMass and playerMass). If new players connect, they
    are added to an array and recieve informations about all other cells in the world.
    An update function is run at a specified interval, to communicate the new positions
    between players.
    If players disconnect, they die (deleted from players-array).
*/

//jshint -W004

//TODO: add constrain to movement of cell
//TODO: add lobby functionality

//basic cell class used for storing and communcating data to client
function Cell(x, y, mass, color, id, name) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.color = color;
    this.id = id;
    this.name = name;
}

//init variables -> maybe load from config file
var port = 8881;
var worldX = 5000;
var worldY = 5000;
var foodMass = 1;
var playerMass = 100;

//players and food are kept seperate as only player-cells need to be updated.
//thus avoiding an >1000 array every update
var players = [];
var food = [];
var foodCount = 0;
var activePlayers = 0;

//connect to libs
var express = require('express'); //fileserver
var socket = require('socket.io'); //communication client-server
var chalk = require('chalk'); //colored console msg

var app = express(); //init express
var server = app.listen(port); //define port to listen to
app.use(express.static('public')); //static file serve

var io = socket(server); //let socket.io know about server
io.on('connection', newConnection); //callback function on new connection
app.get('*', function(req, res){ //redirect to index.html
  res.sendFile(__dirname + '/public/index.html');
});
createWorld();

function createWorld(){
    //create food-cells with unique id, add them to array
    for(var i = 0; i < 1000; i++){
        //console.log(foodCount);
        food.push(new Cell(
             random(-worldX, worldX),
             random(-worldY, worldY),
             foodMass,
             rgb2hex([random(0,255),random(0,255),random(0,255)]),
             foodCount
         ));

        foodCount++;
    }
}

//gets called everytime new player connects
function newConnection(socket){
    console.log('User ' + socket.id + ' connected');

    socket.on('start', start);
    socket.on('move', move);
    socket.on('eat', eat);
    socket.on('disconnect', closeConnection);

    //recieves nickname, generates cell, broadcasts to all clients
    function start(data) {
        console.log(socket.id + " chooses nickname: " + data.name);
        //send all cells to new player
        socket.emit('new food', food);
        //create player
        var player = new Cell(
                            random(-worldX, worldX),
                            random(-worldY, worldY),
                            playerMass,
                            rgb2hex([random(0,255),random(0,255),random(0,255)]),
                            socket.id,
                            data.name);
        players.push(player);
        //send new player to all other clients
        socket.broadcast.emit('new players', [player]);
        socket.emit('start', player);
    }

    //apply new position to cell
    function move(data) {
        //console.log(socket.id + " " + data.x + " " + data.y);
        for (var i = 0; i < players.length; i++) {
            if (players[i].id == socket.id) {
                players[i].x = data.x;
                players[i].y = data.y;
                break;
            }
        }
    }

    //pop dead player/food out of array, update mass of player,
    //send death message to all clients
    //if cell was food, a new random food-cell is created and sent to clients
    function eat(data) {
        //send to all clients
        io.emit('dead cell', data);

        //update mass
        for(var i = 0; i < players.length; i++){
            if(players[i].id == socket.id){
                players[i].mass = data.mass;
                break;
            }
        }

        if(data.isFood){
            console.log(chalk.green('User ' + socket.id + ' ate food'));

            for(var i = 0; i < food.length; i++){
                if(food[i].id == data.id){
                    food.splice(i,1);
                    break;
                }
            }
            //regenerate food with same id
            var newFood = new Cell(
                random(-worldX, worldX),
                random(-worldY, worldX),
                foodMass,
                rgb2hex([random(0,255),random(0,255),random(0,255)]),
                data.id);
            food.push(newFood);
            //send new cell to all clients
            io.emit('new food', [newFood]);
        } else {
            for(var i = 0; i < players.length; i++){
                if(players[i].id == data.id){
                    players.splice(i,1);
                }
            }
            console.log(chalk.yellow('User ' + data.id + ' died'));
        }
    }

    //if player disconnects, delete player or call self-destruct method
    function closeConnection(){
        console.log('User ' + socket.id + ' disconnected');
        //delete player cell (or call funny self-destruct method ;) )
        io.emit('dead cell', {id: socket.id});
        for(var i = 0; i < players.length; i++){
            if(players[i].id == socket.id){
                players.splice(i,1);
            }
        }
        console.log(chalk.yellow('User ' + socket.id + ' committed suicide'));
    }
}

//start message
console.log('Server is running...');

//send update at interval, reduces server load
setInterval(function(){
    io.emit('update', players);
}, 200); //5 times a second

//=================== Santa's little helpers ===================

function rgb2hex(rgb) {
    return (((rgb[0] * 255) << 16) + ((rgb[1] * 255) << 8) + (rgb[2] * 255 | 0));
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
