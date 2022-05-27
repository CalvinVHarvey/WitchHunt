
function Knife(characterName, direction, scaling){
    this.name = "knife";
    this.characterName = characterName;
    this.scaling = scaling;
    this.delay = 5000;
    this.icon = new WebImage("textures/items/knife/knifeIcon.png");
    this.icon.setSize(29, 29);

    this.onHold = false;

    this.deactivateHand = function(){
        inventory.statusEffect.setText(DEFAULT_TEXT);
    };

    this.dist = function(obj, obj1){
        let dist = (obj.getX()-obj1.getX())^2 - (obj.getY()-obj1.getY())^2;
        return Math.sqrt(dist);
    };

    this.inHand = function(){
        if ((inventory.curSpell != undefined && inventory.curSpell.active)) return;
        if (this.onHold) {
            inventory.statusEffect.setText("Must Wait!");
            return;
        }
        if (inventory.curItem.name == this.name){
            let ref = playerRef.texture;
            let min = null;
            for (const key in players){
                if (min == null) min = key;
                let cur = players[key].texture;
                let minPlayer = players[min].texture;
                if (this.getDistance(ref.getX(), ref.getY(), cur.getX(), cur.getY()) < this.getDistance(ref.getX(), ref.getY(), minPlayer.getX(), minPlayer.getY())){
                    min = key;
                    minPlayer = players[key].texture;
                }
            }
            if (!players[min]) return;
            if (this.getDistance(players[min].texture.getX(), players[min].texture.getY(), ref.getX(), ref.getY()) < ref.getWidth()*2){
                inventory.statusEffect.setText("Press E to kill " + players[min].nickname);
            }else {
                inventory.statusEffect.setText("Unable to Kill!");
            }
        }
    };

    this.getDistance = function(x, y, x1, y1){
        let dist = Math.pow(x-x1, 2) + Math.pow(y-y1, 2);
        return Math.sqrt(dist); 
    };
    
    this.activate = function(){
        if (this.onHold) return;
        let ref = playerRef.texture;
        let min = null;
        if (inventory.curSpell != undefined && inventory.curSpell.name == 'invis') return;
        for (const key in players){
            if (min == null) min = key;
            let cur = players[key].texture;
            let minPlayer = players[min].texture;
            if (this.getDistance(ref.getX(), ref.getY(), cur.getX(), cur.getY()) < this.getDistance(ref.getX(), ref.getY(), minPlayer.getX(), minPlayer.getY())){
                min = key;
                minPlayer = players[key].texture;
            }
        }
        if (players[min] == undefined) return;
        if (this.getDistance(players[min].texture.getX(), players[min].texture.getY(), ref.getX(), ref.getY()) < ref.getWidth()*2){
            this.onHold = true;
            socket.emit('playerKilled', {playerKilled: min});
            setTimeout(()=>{this.onHold = false;}, this.delay);
        }
    };
}
function Gun(scaling){
    this.name = "gun";
    this.scaling = scaling;
    this.icon = new WebImage("textures/items/gun/gunIcon.png");
    this.icon.setSize(29, 29);
    this.mouseClick = true;
    this.delay = 5000;
    this.onHold = false;
    this.getDistance = function(x, y, x1, y1){
        let dist = Math.pow(x-x1, 2) + Math.pow(y-y1, 2);
        return Math.sqrt(dist); 
    };
    this.activate = function(){
        this.onHold = true;
        let mx, my;
        let cx = playerRef.texture.getX()+playerRef.texture.getWidth()/2;
        let cy = playerRef.texture.getY()+playerRef.texture.getHeight()/2;
        let msX = mouseX+playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2;
        let msY = mouseY+playerRef.texture.getY()+playerRef.texture.getHeight()/2-(getHeight()+48)/2;
        mx = 10*Math.cos(Math.atan2(msY-cy, msX-cx));
        my = 10*Math.sin(Math.atan2(msY-cy, msX-cx));
        setTimeout(()=>{this.onHold = false;}, this.delay);
        socket.emit('shoot', {origin: myId, moveX: mx, moveY: my, x: cx, y: cy, amount: 1,});
    };
}
function Milk(scaling){
    this.name = "milk";
    this.scaling = scaling;
    this.icon = new WebImage('textures/items/milk/milkIcon.png');
    this.icon.setSize(29,29);
    this.oneTimeUse = true;
    this.activate = function(){
        curStamina = maxStamina;
        inventory.removeItem(inventory.selectedSlot);
    };
}
function Opium(scaling){
    this.name = "opium";
    this.scaling = scaling;
    this.delay = 5000;
    this.icon = new WebImage('textures/items/opium/opiumIcon.png');
    this.icon.setSize(29,29);
    this.oneTimeUse = true;
    this.activate = function(){
        let tempStoreStamina = staminaUsage;
        let tempSpeed = BASESPEED;
        staminaUsage = 0;
        BASESPEED = BASESPEED*2;
        setTimeout(()=>{
            staminaUsage = tempStoreStamina;
            BASESPEED = tempSpeed;
            speed = BASESPEED;
        }, this.delay);
        inventory.removeItem(inventory.selectedSlot);
    };
}
function Stick(scaling){
    this.name = "stick";
    this.scaling = scaling;
    this.stunAmount = 5000;
    this.icon = new WebImage('textures/items/stick/stickIcon.png');
    this.icon.setSize(29,29);
    this.stunDist = 32*scaling*3;
    this.deactivateHand = function(){
        inventory.statusEffect.setText(DEFAULT_TEXT);
    };
    this.inHand = function(){
        if (inventory.curItem.name == this.name){
            let ref = playerRef.texture;
            let min = null;
            for (const key in players){
                if (min == null) min = key;
                let cur = players[key].texture;
                let minPlayer = players[min].texture;
                if (this.getDistance(ref.getX(), ref.getY(), cur.getX(), cur.getY()) < this.getDistance(ref.getX(), ref.getY(), minPlayer.getX(), minPlayer.getY())){
                    min = key;
                }
            }
            if (!players[min]){ 
                inventory.statusEffect.setText(this.name.toUpperCase());
                return;
            }
            if (this.getDistance(players[min].texture.getX(), players[min].texture.getY(), ref.getX(), ref.getY()) < ref.getWidth()*2){
                inventory.statusEffect.setText("Press E to stun " + players[min].nickname);
            }else {
                inventory.statusEffect.setText("Unable to Stun!");
            }
        }
    };
    this.getDistance = function(x, y, x1, y1){
        let dist = Math.pow(x-x1, 2) + Math.pow(y-y1, 2);
        return Math.sqrt(dist); 
    };
    this.activate = function(){
        let ref = playerRef.texture;
        let min = null;
        for (const key in players){
            if (min == null) min = key;
            let cur = players[key].texture;
            let minPlayer = players[min].texture;
            if (this.getDistance(ref.getX(), ref.getY(), cur.getX(), cur.getY() < this.getDistance(ref.getX(), ref.getY(), minPlayer.getX(), minPlayer.getY()))){
                min = key;
            }
        }
        if (!players[min]) return;
        if (this.getDistance(players[min].texture.getX(), players[min].texture.getY(), ref.getX(), ref.getY()) < this.stunDist){
            socket.emit('stun', {player: min, amount: this.stunAmount, x:players[min].texture.getX(), y:players[min].texture.getY()});
            inventory.removeItem(inventory.selectedSlot);
        }
    }
}