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

//Create a container that will hold everything
var stage = new PIXI.Container();
stage.interactive = true;
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
//var filter =  new PIXI.filters.BlurFilter();
//filter.blur = 100;
//world.filters = [filter];
//zoom-in effect (add this on start of game loop)
//filter.blur = lerp(filter.blur,0,0.1);

//show login

//...

//get random position, which is not inside other player
var player = new Cell(0,0,10,"Player");
world.addChild(player);

//=================== Setup Socket ===================

var players = [];
var food = [];

//Connect to server
//var socket = io.connect('http://192.168.1.130:8888');
var socket = io.connect('http://localhost:8888');

socket.on('start', function(data){
    for(var i = 0; i < data.length; i++) {
        var newPlayer = new Cell(data[i].x, data[i].y, data[i].mass,
                         data[i].name, data[i].color, data[i].id);
        players.push(newPlayer);
        world.addChild(newPlayer);
    }
});

socket.on('update', function(data) {
    //console.log(data.id + " " + data.x + " " + data.y + " " + data.mass);
    for(var i = 0; i < players.length; i++){
        if (players[i].id == data.id) {
            players[i].position.x = data.x;
            players[i].position.y = data.y;
            players[i].mass = data.mass;
            players[i].drawCircle();
            players[i].drawText();
            break;
        }
    }
});

socket.on('newPlayer', function(data) {
    var newPlayer = new Cell(data.x, data.y, data.mass, data.name, data.color, data.id);
    players.push(newPlayer);
    world.addChild(newPlayer);
});

socket.on('deadPlayer', function(data){

});

var data = {
    name: player.name,
    x: player.position.x,
    y: player.position.y,
    mass: player.mass,
    color: player.color
};

socket.emit('start', data);

setInterval(function(){
    var data = {
        x: player.position.x,
        y: player.position.y,
        mass: player.mass
    };
    socket.emit('move', data);
},33);

//create world
for(var i = 0; i < 1000; i++) food.push(new Cell(random(-1000,1000), random(-1000,1000), 1));
for(var i = 0; i < food.length; i++) world.addChild(food[i]);

//start game loop
gameLoop();

function gameLoop() {
    //loop this function @ 60 fps
    requestAnimationFrame(gameLoop);
    //update game state
    state();
    //render stage
    renderer.render(stage);
}

function state() {
    //update positions
    player.update();

    //smooth camera movement
    //TODO: make scale (150) variable by scrolling
    var newScale = lerp(world.scale.x, 150/player.radius, 0.1);
    world.scale = new PIXI.Point(newScale, newScale);
    world.pivot.x = lerp(world.pivot.x, player.position.x, 0.2);
    world.pivot.y = lerp(world.pivot.y, player.position.y, 0.2);
    world.x = window.innerWidth/2;
    world.y = window.innerHeight/2;

    //update collisions
    var other;
    for(i = 0; i < food.length; i++){
        other = food[i];
        if(player.eat(other)){
            world.removeChild(other);
            food.splice(i,1);
        }
    }
    for(i = 0; i < players.length; i++){
        other = players[i];
        if(player.eat(other)){
            world.removeChild(other);
            players.splice(i,1);
            //socket.emit('die');
        }
    }
}

function onMove(event){
    //supports both touch and mouse
    var input = event.data.global;

    //calculate translation
    input.x -= window.innerWidth/2;
    input.y -= window.innerHeight/2;
    player.velocity = input;
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
