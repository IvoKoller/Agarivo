/*
    Name: Agarivo
    Version: 0.0.1 (25.2.2017)
    Author: Ivo Koller
    License: MIT
    Description: This file hold the cell class. It extends the PIXI.container class.
    This has the advantage that multiple objects - even other cells - can be positioned
    relative to this object. This class is used to create both players and pallets
    as pallets are basically just a simple version of a player. The class has six
    parameters, one of which (name) is optional, which is omitted when creating
    pallets/food-cells. It features three functions - drawCircle(), drawText() and
    eat(). DrawCircle() renders a cell, drawText() the nickname and mass. Eat()
    checks wheter or not the other cell is eatable and returns a boolean value
    depending on the result of that check. If the result is positive, the mass is added
    and the cell is redrawn.
*/


function Cell(x, y, mass, color, id, name) { //name is optional - used to detect food
    PIXI.Container.call(this);//extends container

    this.position.x = x;
    this.position.y = y;
    this.mass = mass;
    this.name = name;
    this.isPlayer = false;
    this.color = color;
    this.id = id;
    this.speed = 5;
    this.velocity = new PIXI.Point(1,1);
    this.circle = new PIXI.Graphics();
    this.addChild(this.circle);

    //assuming food
    this.isPlayer = false;
    var minRadius = 100;

    this.drawCircle = function(){
        this.circle.beginFill(this.color);
        this.radius = Math.sqrt(this.mass*minRadius*Math.PI);
        if(name !== undefined) this.circle.lineStyle(this.radius*0.1, (this.color & 0xfefefe) >> 1); //border
        //drawCircle coordinates do NOT position element
        this.circle.drawCircle(0, 0, this.radius*0.95);
        //block mode
        //this.circle.drawRect(-this.radius, -this.radius, 2*this.radius, 2*this.radius);
    };

    this.drawText = function(){
        if(this.isPlayer){
            var style = {
                stroke : '#000000',
                strokeThickness : this.radius/30,
                align : 'center',
                fill: '#FFFFFF',
                fontSize: this.radius/5
            };
            this.text.style = style;
            this.text.text = this.name + '\n' + this.mass;
        }
    };

    this.eat = function(other){
        if(distance(this.position, other.position) < this.radius + other.radius*0.05 &&
        this.mass*0.75 > other.mass){
            this.mass += other.mass;
            this.circle.clear();
            this.drawCircle();
            this.drawText();
            return true;
        }
        return false;
    };

    //init
    if(name !== undefined){ //if player
        this.drawCircle();
        this.isPlayer = true;
        this.text = new PIXI.Text(name);
        this.text.anchor.set(0.5);
        this.addChild(this.text);
        this.drawText();
    }else this.drawCircle(); //if food

}
//Set Cell's prototype to Container's prototype
Cell.prototype = Object.create(PIXI.Container.prototype);
// Set constructor back to Cell
Cell.prototype.constructor = Cell;
