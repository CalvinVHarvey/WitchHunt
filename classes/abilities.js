function Blip(){
    this.icon = new WebImage("textures/abilities/blipIcon.png");
    this.icon.setSize(32, 32);
    this.delay = 10000;
    this.mouseClick = true;
    this.onHold = false;
    this.activate = function(){
        if(this.onHold) return;
        let msX = mouseX+playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2;
        let msY = mouseY+playerRef.texture.getY()+playerRef.texture.getHeight()/2-(getHeight()+48)/2;
        let prevX = playerRef.texture.getX();
        let prevY = playerRef.texture.getY();
        let useX = msX - prevX;
        let useY = msY - prevY;
        playerRef.texture.setPosition(msX, msY);
        playerRef.hand.setPosition(msX, msY);
        playerRef.textObj.setPosition(msX+playerRef.texture.getWidth()/2-playerRef.textObj.getWidth()/2, msY-playerRef.textObj.getHeight()/2);
        this.onHold = true;
        socket.emit('sound', {x: playerRef.texture.getX(), y: playerRef.texture.getY(), audio:'blip',});
        setTimeout(()=>{this.onHold = false;}, this.delay);
        ctx.translate(-useX, -useY);
    };
}
function HideSpell(){
    this.icon = new WebImage('textures/abilities/hideIcon.png');
    this.icon.setSize(32,32);
    this.name = 'invis';
    this.delay = 20000;
    this.onHold = false;
    this.mouseClick = false;
    this.lasts = 10000;
    this.active = false;
    this.activate = function(){
        if(this.onHold) return;
        socket.emit('invisible', {id:myId, value: true});
        this.onHold = true;
        this.active = true;
        inventory.statusEffect.setText("Invisibility Enabled");
        setTimeout(()=>{
            inventory.statusEffect.setText(DEFAULT_TEXT);
            socket.emit('invisible', {id:myId, value:false});
            this.active = false;
        }, this.lasts);
        setTimeout(()=>{
            this.onHold = false;
        },this.delay);
    }
}
function Disguise(){
    this.icon = new WebImage('textures/abilities/disguiseIcon.png');
    this.icon.setSize(32,32);
    this.delay = 30000;
    this.onHold = false;
    this.mouseClick = false;
    this.selectedPlayer = null;
    this.selectedPlayerId = null;
    this.lasts = 20000;
    this.onClick = function(){
        let useX = mouseX+playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2;
        let useY = mouseY+playerRef.texture.getY()+playerRef.texture.getHeight()/2-(getHeight()+48)/2;
        let prevX = playerRef.texture.getX();
        let prevY = playerRef.texture.getY();
        for (const key in players){
            let cur = players[key].texture;
            if (cur.getX() < useX && cur.getX()+cur.getWidth() > useX && useY < cur.getY()+cur.getHeight() && cur.getY() < useY){
                this.selectedPlayer = key;
                println("Stored ".fontcolor('#880088') + players[key].nickname.fontcolor('#880088') +" to imitate!<br>".fontcolor('#880088'));
                return;
            }
        }
    };
    this.activate = function(){
        if(this.onHold) return;
        let disID = null;
        if (this.selectedPlayer == null) {
            println('Click on a player to store their identity! None stored yet!<br>'.fontcolor('#880000'));
            return;
        }
        disID = this.selectedPlayer;
        let tempAssignedText = assignedTexture;
        if (disID == null){ return;}
        else if(!players[disID]){
            println("Player does not exist!".fontcolor('#770000'));
        }
        if(walkAnimLeft.isOn) walkAnimLeft.stop(playerRef.texture);
        if(walkAnimRight.isOn) walkAnimRight.stop(playerRef.texture);
        assignedTexture = players[disID].characterName;
        walkAnimLeft = new Animation(players[disID].characterName+"Left", 3, 100, playerWidth*scaling, playerHeight*scaling);
        walkAnimRight = new Animation(players[disID].characterName+"Right", 3, 100, playerWidth*scaling, playerHeight*scaling);
        walkAnimLeft.load();
        walkAnimRight.load();
        playerRef.textObj.setLabel(players[disID].nickname);
        socket.emit('disguise', {id:myId, value: true, disguiseID: disID});
        this.onHold = true;
        setTimeout(()=>{
            if(walkAnimLeft.isOn) walkAnimLeft.stop(playerRef.texture);
            if(walkAnimRight.isOn) walkAnimRight.stop(playerRef.texture);
            walkAnimLeft = new Animation(assignedTexture+"Left", 3, 100, playerWidth*scaling, playerHeight*scaling);
            walkAnimRight = new Animation(assignedTexture+"Right", 3, 100, playerWidth*scaling, playerHeight*scaling);
            walkAnimLeft.load();
            walkAnimRight.load();
            playerRef.textObj.setLabel(myName);
            assignedTexture = tempAssignedText;
            socket.emit('disguise', {id:myId, value:false,});
        }, this.lasts);
        setTimeout(()=>{
            this.onHold = false;
        }, this.delay);
    };
}
function Speed(){
    this.name = 'speed';
    this.icon = new WebImage('textures/abilities/speedIcon.png');
    this.icon.setSize(32,32);
    this.onHold = false;
    this.delay = 16000;
    this.lasts = 6000;
    this.activate = function(){
        if (this.onHold) return;
        let tempBase = BASESPEED;
        this.onHold = true;
        BASESPEED = 2*BASESPEED;
        speed = BASESPEED;
        setTimeout(()=>{BASESPEED = tempBase; speed = BASESPEED;}, this.lasts);
        setTimeout(()=>{this.onHold = false;}, this.delay);
    }
}