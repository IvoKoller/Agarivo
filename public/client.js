//=================== Cell class ===================

function Cell(x, y, name) { //extends container
    PIXI.Container.call(this);
    this.circle = new PIXI.Graphics();
    this.addChild(this.circle);

    this.position.x = x;
    this.position.y = y;

    this.velocity = new PIXI.Point(1,1);
    this.speed = 3;
    this.mass = 1;
    this.radius = 10;
    this.color = PIXI.utils.rgb2hex([random(0,255),random(0,255),random(0,255)]);
    this.isPlayer = false;

    this.init = function(){
        if(name !== undefined){ //is player
            this.isPlayer = true;
            this.radius = 64;
            this.mass = 10;

            this.name = name;
            this.text = new PIXI.Text(name);
            this.text.anchor.set(0.5);
            this.addChild(this.text);
            this.drawText();
        }

        this.drawCircle();
    };

    this.drawCircle = function(){
        this.circle.beginFill(this.color);
        if(this.isPlayer) this.circle.lineStyle(this.radius*0.1, (this.color & 0xfefefe) >> 1); //border
        //drawCircle coordinates do NOT position element
        this.circle.drawCircle(0, 0, this.radius*0.95);
    };

    this.drawText = function(){
        var style = {
            stroke : '#000000',
            strokeThickness : this.radius/30,
            align : 'center',
            fill: '#FFFFFF',
            fontSize: this.radius/5
        };
        this.text.style = style;
        this.text.text = this.name + '\n' + this.mass;
    };

    this.eat = function(other){
        if(distance(this.position, this.position) < this.radius + other.radius){
            //delete from world
            world.removeChild(i);
            other.destroy();
            
            this.radius = Math.sqrt(Math.pow(this.radius,2) + Math.pow(other.radius,2));
            this.mass += other.mass;
            this.circle.clear();
            this.drawCircle();
            //update Text
            this.drawText();
            //send message to server
        }
    };

    this.update = function(){
        var mouse = renderer.plugins.interaction.mouse.global;
        //calculate translation
        mouse.x -= window.innerWidth/2;
        mouse.y -= window.innerHeight/2;

        this.velocity = limit(mouse,speed);

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    };

    //initialize Object
    this.init();
}
//Set Cell's prototype to Container's prototype
Cell.prototype = Object.create(PIXI.Container.prototype);
// Set constructor back to Cell
Cell.prototype.constructor = Cell;


//=================== Setup Socket ===================

var players = [];

//Connect to server
var socket = io.connect('http://localhost:8888');
socket.on('heartbeat', function(data) { players = data; }); //callback if data is recieved

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

// var texture = PIXI.Texture.fromImage('img/grid.png');
// var background = new PIXI.extras.TilingSprite(texture, window.innerWidth, window.innerHeight);
// world.addChild(background);

//get random position, which is not inside other player
var player = new Cell(0,0,"Player");
world.addChild(player);

var data = {
    id: player.id,
    x: player.position.x,
    y: player.position.y,
    radius: player.radius,
    color: player.color
};
socket.emit('start', data);

//get food
for(var i = 0; i < 1000; i++){
    var cell = new Cell(random(-1000,1000),random(-1000,1000));
    world.addChild(cell);
}

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
    //update position

    world.scale = new PIXI.Point(100/player.radius, 100/player.radius);
    world.pivot.x = player.position.x;
    world.pivot.y = player.position.y;
    world.x = window.innerWidth/2;
    world.y = window.innerHeight/2;

    //console.log(velocity);

    //update collisions
    for(var i = 1; i < world.children.length; i++){
        var other = world.getChildAt(i);


    }
}

function onMove(event){
    player.update();
    var data = {
        id: player.id,
        x: player.position.x,
        y: player.position.y,
        radius: player.radius,
        color: player.color
    };
    socket.emit('move', data);
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
