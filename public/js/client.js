/*
    Name: Agarivo
    Version: 0.0.1 (25.2.2017)
    Author: Ivo Koller
    License: MIT
    Description: This file takes care of the client-side of the application. It
    renders the scene using PIXI.js and communcates to the server using socket.io.
    Upon recieving all files from the server, PIXI is used to create a canvas within
    index.html. Two new containers are created (stage and world) - one for absolute
    positioning (UI) and one for world-positioning (Game). Then, textures are loaded,
    a basic scene is rendered and the client starts communicating to the server.
    The server assigns a unique id to the client, which is used to identify this
    specific client from all the other ones. The server creates the cell
    and sends it, along with all other cells, back to the player. The gameLoop
    starts and renders the first frame. The gamestate is updated using the state()
    function which handles camera movement, collisions and updating the positions
    of the other cells.
*/

//jshint -W004


//=================== Setup PIXI ===================

//Create a Pixi renderer auto detect -> try WebGL and use canvas as fallback
var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight,
    {antialias: true, backgroundColor : 0x373a45});

renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;

window.onresize = function(event) { //make canvas resize
    renderer.resize(window.innerWidth, window.innerHeight);
};

//Append canvas to the HTML body
document.body.appendChild(renderer.view);
document.getElementsByTagName("CANVAS")[0].addEventListener("wheel", onWheel);
//Create a container that will hold everything
var stage = new PIXI.Container();
stage.interactive = false;
stage.on('mousemove', onMove); //call function if mouse over stage
stage.on('touchmove', onMove); //enable touch support

//container for game
var world = new PIXI.Container();
stage.addChild(world);

//=================== Setup game ===================

var texture = PIXI.Texture.fromImage('img/gridTriangular.png');
var background = new PIXI.extras.TilingSprite(texture, 20000, 20000);
background.position.x = -10000;
background.position.y = -10000;
world.addChild(background);

//blur world
var filter =  new PIXI.filters.BlurFilter();
filter.passes = 10;
filter.blur = 15;
//world.filters = [filter];
//zoom-in effect (add this on start of game loop)
//filter.blur = lerp(filter.blur,0,0.1);

//init variables
var players = [];
var deltaPos = new PIXI.Point();
var newPos = [];
var food = [];
var player;
var id;
var scale = 150;
var scaleMin = 50;
var scaleMax = 150;
var scaleSpeed = 50;
//=================== Setup Socket ===================

//Connect to server
var socket = io.connect();

socket.on('connect', function(data){
    id = socket.io.engine.id;
});

socket.on('start', function(data){
    player = new Cell(data.x,data.y,data.mass,data.color,id,data.name);
    players.push(player);
    world.addChild(player);
    //enable mouse/touch interaction -> onMove()
    stage.interactive = true;

    //send position 10x/second, reduce load on client/server
    setInterval(function(){
        socket.emit('move', deltaPos);
    }, 100);

    //start game loop
    gameLoop();
});

//update position data
socket.on('update', function(data){
    //console.log('update recieved');
    newPos = data;
});

socket.on('new players', function(data){
    for(var i = 0; i < data.length; i++){
        var newPlayer = new Cell(
            data[i].x,
            data[i].y,
            data[i].mass,
            data[i].color,
            data[i].id,
            data[i].name);
        players.push(newPlayer);
        world.addChild(newPlayer);
    }
});

socket.on('new food', function(data){
    for(var i = 0; i < data.length; i++){
        var newFood = new Cell(
            data[i].x,
            data[i].y,
            data[i].mass,
            data[i].color,
            data[i].id);
        food.push(newFood);
        world.addChild(newFood);
    }
});

socket.on('dead cell', function(data){
    //console.log(data.id);
    if(data.isFood){
        for(var i = 0; i < food.length; i++){
            if(food[i].id == data.id){
                world.removeChild(food[i]);
                food.splice(i,1);
                break;
            }
        }
    } else {
        if(data.id == id){ //if this player
            player.velocity = new PIXI.Point(0,0);
            world.removeChild(player);
            stage.interactive = false;
            document.getElementById('mass').innerHTML = document.getElementById('mass').innerHTML + player.mass;
            document.getElementById('endScreen').style.display = 'block';
            document.getElementById('outer').style.display = 'table';
            document.getElementById('startScreen').style.display = 'none';
        } else { //if other player
            for(var i = 0; i < players.length; i++){
                if(players[i].id == data.id){
                    world.removeChild(players[i]);
                    players.splice(i,1);
                    break;
                }
            }
        }
    }

    //update leaderboard
    players.sort(function(a, b) { return a.mass - b.mass; });
    //TODO: add leaderboard
});

function start(){
    console.log("My ID: " + id);
    //hide login
    document.getElementById('outer').style.display = 'none';
    //create player from data
    socket.emit('start', { name: document.getElementById('nick').value } );
}

function gameLoop() {
    //loop this function @ 60 fps
    requestAnimationFrame(gameLoop);
    //update game state
    state();
    //render stage
    renderer.render(stage);
}

function state() {
    //update position
    var vel = limit(player.velocity,player.speed);
    deltaPos.x += vel.x;
    deltaPos.y += vel.y;

    //lerp between recieved positions
    for(var d = 0; d < newPos.length; d++){
        for(var i = 0; i < players.length; i++){
            var p = players[i];
            if (p.id == newPos[d].id) {
                p.position.x = lerp(p.position.x, newPos[d].x, 0.05);
                p.position.y = lerp(p.position.y, newPos[d].y, 0.05);
                p.mass = newPos[d].mass;
                p.drawCircle();
                p.drawText();
                break;
            }
        }
    }

    //smooth camera movement
    var newScale = lerp(world.scale.x, scale/player.radius, 0.1);
    world.scale = new PIXI.Point(newScale, newScale);
    world.pivot.x = lerp(world.pivot.x, player.position.x, 0.2);
    world.pivot.y = lerp(world.pivot.y, player.position.y, 0.2);
    world.x = window.innerWidth/2;
    world.y = window.innerHeight/2;

    //update collisions
    var other;

    //check for player collisions
    for(var i = 0; i < players.length; i++){
        other = players[i];
        //handle overlapping
        if((player.mass > other.mass && world.getChildIndex(player) < world.getChildIndex(other)) ||
        (player.mass < other.mass && world.getChildIndex(player) > world.getChildIndex(other))){
            world.swapChildren(player, other);
        }
        if(player.eat(other)){
            socket.emit('eat', {mass: player.mass, id: other.id, isFood: false});
            world.removeChild(other);
            players.splice(i,1);
        }
    }

    //check for food collisions
    for(var i = 0; i < food.length; i++){
        other = food[i];
        //handle overlapping
        if((player.mass > other.mass && world.getChildIndex(player) < world.getChildIndex(other)) ||
        (player.mass < other.mass && world.getChildIndex(player) > world.getChildIndex(other))){
            world.swapChildren(player, other);
        }
        if(player.eat(other)){
            socket.emit('eat', {mass: player.mass, id: other.id, isFood: true});
            world.removeChild(other);
            food.splice(i,1);
        }
    }

}

function onMove(event){ //callback for mousemove
    //use event - supports both touch and mouse
    var input = event.data.global;

    //calculate translation
    input.x -= window.innerWidth/2;
    input.y -= window.innerHeight/2;
    player.velocity = input;
}

function onWheel(event){ //scroll callback -> sets new scale accordingly
    if((scale > scaleMin && event.deltaY > 0) || (scale < scaleMax && event.deltaY < 0)){
        scale -= scaleSpeed/event.deltaY;
    }
}

//=================== Santa's little helpers ===================

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function distance(first, second){
    return Math.sqrt((first.x - second.x) * (first.x - second.x) +
                   (first.y - second.y) * (first.y - second.y));
}

function limit(vector, n){
    var m = Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
    if(m > n){
        vector.x *= n/m;
        vector.y *= n/m;
    }
    return vector;
}

function lerp(start,end,percent){
    return (start + percent*(end - start));
}
