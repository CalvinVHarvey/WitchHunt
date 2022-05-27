
const staminaOffset = 20;
const staminaXOffset = 10;
const SCREEN_OFFSET = 0;
const INV_OFFSET = 25;
let maxLength = 100;
let length = 100;
const width = 5;
let maxStamina = 100;

const DEFAULT_TEXT = "EMPTY HAND";

let staminaUsage = 2;

let staminaRegenRate = 1;

let regen = false;

let curStamina = 100;

function Inventory(){
    this.texture = new WebImage("textures/inventory.png");
    this.witchMode = false;
    this.setMode = Game.INTERMISSION;
    this.texture.setSize(500, 50);
    this.timebck = new WebImage('textures/timerscreen.png');
    this.timebck.setSize(500, 50);
    add(this.timebck);
    this.timebck.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2, playerRef.texture.getY()+playerRef.texture.getHeight()/2-getHeight()/2);
    this.gameStatus = new Text('INTERMISSION', "20pt Rubik Wet Paint");
    this.gameStatus.setColor(new Color(180, 40, 0));
    this.gameStatus.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/2-this.gameStatus.getWidth()/2, playerRef.texture.getY()+playerRef.texture.getHeight()/2-getHeight()/2);
    add(this.gameStatus);
    this.selectedSlot = null;
    this.statusEffect = new Text(DEFAULT_TEXT, "10pt Cooper Black");
    this.statusEffect.setColor(new Color(96, 8, 0));
    this.statusEffect.setBorder(true);
    this.statusEffect.setBorderWidth(5);
    add(this.statusEffect);
    this.texture.setPosition(0, 500-this.texture.getHeight());
    add(this.texture);
    this.items = [null, null, null, null, null, null];
    this.curItem = null;
    this.spellMenu = new WebImage('textures/spellSheet.png');
    this.spellMenu.setSize(100, 200);
    this.spellMenu.setPosition(this.texture.getX()+getWidth()-this.spellMenu.getWidth()-SCREEN_OFFSET, this.texture.getY()-this.spellMenu.getHeight()-INV_OFFSET);
    if (this.witchMode) add(this.spellMenu);
    this.statusEffect.setPosition(this.texture.getX()+getWidth()-this.statusEffect.getWidth()/2, this.texture.getY()-staminaXOffset);
    this.spells = [null, null];
    this.stamina = new Line(this.texture.getX()+staminaXOffset, this.texture.getY()-staminaOffset, this.texture.getX()+staminaXOffset+length, this.texture.getY()-staminaOffset);
    this.stamina.setLineWidth(width);
    this.stamina.setColor(Color.blue);
    this.staminaBck = new WebImage("textures/staminaBar.png");
    this.staminaBck.setSize(106, 16);
    this.staminaBck.setPosition(this.stamina.getX()-2, this.stamina.getY()-this.staminaBck.getHeight()/2);
    add(this.stamina);
    add(this.staminaBck);
    this.enableWitchMode = function(){
        this.witchMode = true;
        add(this.spellMenu);
    };
    this.disableWitchMode = function(){
        this.witchMode = false;
        remove(this.spellMenu);
    };
    this.isFull = function(){
        for (let i = 0; i < this.items.length; i++){
            if (this.items[i] == null){
                return false;
            }
        }
        return true;
    };
    this.addItem = function(item){
        let count = 0;
        while (count < this.items.length){
            if (this.items[count] == null){
                this.items[count] = item;
                this.items[count].icon.setPosition(this.texture.getX()+140+(38*count), this.texture.getY()+13);
                add(this.items[count].icon);
                break;
            }
            count++;
        }
        if (count == this.items.length){
            println("Inventory Full!<br>");
        }
    };
    this.addSpell = function(spell){
        for (let i = 0; i < this.spells.length; i++){
            if (this.spells[i] != null) continue;
            this.spells[i] = spell;
            this.spells[i].icon.setPosition(this.spellMenu.getX()+33, this.spellMenu.getY()+72+(48*i));
            add(this.spells[i].icon);
            break;
        }
    };
    this.removeSpell = function(num){
        remove(this.spells[num].icon);
        this.spells[num] = null;
        if(num == this.selectedSpell) this.curSpell = null;
    };
    this.removeItem = function(num){
        if (this.items[num].icon) {
            remove(this.items[num].icon);
        }
        this.items[num] = null;
        if (num == this.selectedSlot){ playerRef.hand.setImage("textures/items/"+assignedTexture+"empty"+playerRef.direction+".png"); playerRef.hand.setSize(32*scaling,32*scaling); this.curItem = null;}
    };
    this.reload = function(){
        remove(this.texture);
        add(this.texture);
        remove(this.timebck);
        add(this.timebck);
        for (let i = 0; i < this.items.length; i++){
            let cur = this.items[i];
            if (cur != null && cur.icon != null){
                remove(cur.icon);
                add(cur.icon);
            }
        }
        this.reloadStamina();
        remove(this.gameStatus);
        add(this.gameStatus);
        remove(this.stamina);
        add(this.stamina);
        remove(this.staminaBck);
        add(this.staminaBck);
        remove(this.statusEffect);
        add(this.statusEffect);
        if(!this.witchMode) return;
        remove(this.spellMenu);
        add(this.spellMenu);
        for (let i = 0; i < this.spells.length; i++){
            if (this.spells[i] == null) continue;
            remove(this.spells[i].icon);
            add(this.spells[i].icon);
        }
    };
    this.reloadStamina = function(){
        length = maxLength*(curStamina/maxStamina);
        this.stamina.setPosition(this.texture.getX()+staminaXOffset, this.texture.getY()-staminaOffset);
        this.stamina.setEndpoint(this.texture.getX()+staminaXOffset+length, this.texture.getY()-staminaOffset);
        this.staminaBck.setPosition(this.stamina.getX()-2, this.stamina.getY()-this.staminaBck.getHeight()/2);
    };
    this.rePos = function(playerRef){
        this.timebck.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2, playerRef.texture.getY()+playerRef.texture.getHeight()/2-getHeight()/2);
        this.texture.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2, playerRef.texture.getY()+playerRef.texture.getHeight()/2+getHeight()/2-inventory.texture.getHeight());
        this.gameStatus.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/2-this.gameStatus.getWidth()/2, playerRef.texture.getY()+playerRef.texture.getHeight()-getHeight()/2);
        for (let i = 0; i < this.items.length; i++){
            let cur = this.items[i];
            if (cur != null && cur.icon != null){
                cur.icon.setPosition(this.texture.getX()+140+(38*i), this.texture.getY()+13);
            }
        }
        this.reloadStamina();
        this.statusEffect.setPosition(this.texture.getX()+getWidth()/2-this.statusEffect.getWidth()/2, this.texture.getY()-staminaXOffset);
        if(!this.witchMode) return;
        this.spellMenu.setPosition(this.texture.getX()+getWidth()-this.spellMenu.getWidth()-SCREEN_OFFSET, this.texture.getY()-this.spellMenu.getHeight()-INV_OFFSET);
        for (let i = 0; i < this.spells.length; i++){
            if (this.spells[i] == null) continue;
            this.spells[i].icon.setPosition(this.spellMenu.getX()+33, this.spellMenu.getY()+72+(48*i));
        }
    };
    this.clear = function(){
        for (let i = 0; i < this.items.length; i++){
            if (this.items[i] != null){
                this.removeItem(i);
            }
        }
        for (let i = 0; i < this.spells.length; i++){
            if (this.spells[i] != null){
                this.removeSpell(i);
            }
        }
        this.disableWitchMode();
    };
    this.selectSpell = function(num){
        this.spellMenu.setImage('textures/spellSheet'+(num)+".png");
        this.spellMenu.setSize(100, 200);
        this.selectedSpell = num-1;
        this.curSpell = this.spells[num-1];
    };
    this.selectSlot = function(num){
        this.texture.setImage("textures/inventory"+num+".png");
        this.texture.setSize(500, 50);
        if (this.curItem != null && this.curItem.inHand != undefined) this.curItem.deactivateHand();
        this.selectedSlot = num-1;
        this.curItem = this.items[num-1];
        if (this.curItem != null && this.curItem.inHand != undefined) this.curItem.inHand();
        else if(this.curItem != null && this.curItem.inHand == undefined) this.statusEffect.setText(this.curItem.name.toUpperCase());
        else if(this.curItem == null) this.statusEffect.setText(DEFAULT_TEXT);
    };
}