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
stage.interactive = false;
stage.on('mousemove', onMove); //call function if mouse over stage
stage.on('touchmove', onMove); //enable touch support

//container for game
var world = new PIXI.Container();
stage.addChild(world);

//=================== Setup game ===================

var players = [];
var food = [];

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

//show login

//...


//get random position, which is not inside other player
var player;
var id;

//=================== Setup Socket ===================

//Connect to server
var socket = io.connect('192.168.1.11:8888');
//var socket = io.connect('http://localhost:8888');

socket.on('connect', function(data){
    id = socket.io.engine.id;
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

socket.on('new player', function(data) {
    var newPlayer = new Cell(data.x, data.y, data.mass, data.name, data.color, data.id);
    players.push(newPlayer);
    world.addChild(newPlayer);
});

socket.on('dead player', function(data){
    console.log(data.id);
    if(data.id == id){
        player.velocity = new PIXI.Point(0,0);
        world.removeChild(player);
        stage.interactive = false;
        document.getElementById('mass').innerHTML = document.getElementById('mass').innerHTML + player.mass;
        document.getElementById('endScreen').style.display = 'block';
        document.getElementById('outer').style.display = 'table';
        document.getElementById('startScreen').style.display = 'none';
    } else {
        for(i = 0; i < players.length; i++){
            if(players[i].id == data.id){
                world.removeChild(players[i]);
                players.splice(i,1);
            }
        }
    }
});

//create world
for(var i = 0; i < 1000; i++) food.push(new Cell(random(-1000,1000), random(-1000,1000), 1));
for(var i = 0; i < food.length; i++) world.addChild(food[i]);

//render first frame
//state();
renderer.render(stage);

function start(){
    player = new Cell(0,0,10,document.getElementById('nick').value);
    world.addChild(player);
    players.push(player);
    document.getElementById('outer').style.display = 'none';

    var data = {
        name: player.name,
        x: player.position.x,
        y: player.position.y,
        mass: player.mass,
        color: player.color
    };

    socket.emit('start', data);
    stage.interactive = true;
    setInterval(function(){
        var data = {
            x: player.position.x,
            y: player.position.y,
            mass: player.mass
        };
        socket.emit('move', data);
    },33);

    gameLoop();
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
            if((player.mass > other.mass && world.getChildIndex(player) < world.getChildIndex(other)) ||
                (player.mass < other.mass && world.getChildIndex(player) > world.getChildIndex(other))){
                    world.swapChildren(player,other);
            }
            world.removeChild(other);
            food.splice(i,1);
        }
    }

    for(i = 0; i < players.length; i++){
        other = players[i];
        if(player.eat(other)){
            if((player.mass > other.mass && world.getChildIndex(player) < world.getChildIndex(other)) ||
                (player.mass < other.mass && world.getChildIndex(player) > world.getChildIndex(other))){
                    world.swapChildren(player,other);
            }

            socket.emit('eat', {id: other.id});
            world.removeChild(other);
            players.splice(i,1);
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
