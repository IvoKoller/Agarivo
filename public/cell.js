function Cell(x, y, mass, name, color, id) { //extends container
    PIXI.Container.call(this);

    this.position.x = x;
    this.position.y = y;
    this.mass = mass;
    this.name = name;
    this.color = PIXI.utils.rgb2hex([random(0,255),random(0,255),random(0,255)]);
    if(color !== undefined) this.color = color;
    this.id = id;
    this.speed = 3;
    this.velocity = new PIXI.Point(1,1);
    this.circle = new PIXI.Graphics();
    this.addChild(this.circle);

    //assuming food
    this.isPlayer = false;
    var minRadius = 100;

    this.drawCircle = function(){
        this.circle.beginFill(this.color);
        this.radius = Math.sqrt(this.mass*minRadius*Math.PI);
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

    this.update = function(){
        this.velocity = limit(this.velocity,this.speed);
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    };

    // draw cell
    this.drawCircle();

    if(name !== undefined){ //if player
        this.isPlayer = true;
        this.text = new PIXI.Text(name);
        this.text.anchor.set(0.5);
        this.addChild(this.text);
        this.drawText();
    }
}
//Set Cell's prototype to Container's prototype
Cell.prototype = Object.create(PIXI.Container.prototype);
// Set constructor back to Cell
Cell.prototype.constructor = Cell;

function compareCells(a,b){
  if (a.mass < b.mass) return -1;
  if (a.mass > b.mass) return 1;
  return 0;
}
