class Player {
    constructor (texture, x, y){
        this.isDead = false;
        this.x = x;
        this.spectator = false;
        this.y = y;
        this.texture = new WebImage(texture);
        this.texture.setPosition(x, y);
    }
    setPosition(x, y){
        this.x = x;
        this.y = y;
        this.texture.setPosition(x, y);
    }
    move (dx, dy){
        this.x += dx;
        this.y += dx;
        this.texture.move(dx, dy);
    }
    setSpectator(){
        this.spectator = true;
        this.texture = new WebImage();
    }
    addTexture(){
        add(this.texture);
    }
    get texture(){return this.texture;};
    get getX(){return this.x;}
    get getY(){return this.y;}
    get getWidth(){return this.texture.getWidth();}
    get getHeight(){return this.texture.getHeight();}
};