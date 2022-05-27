
const socket = io('ws://localhost:5000');

let ctx;

let Game = {
    INTERMISSION : "intermission",
    INGAME : "ingame",
};

let curGame = 'intermission';

const nameFont = "8pt ";
const fontSize = "luminari";
let BASESPEED = 2;

let currentChatChannel = "global";

let gameOn = false;

let currentMap;
let mapDataObj;
let baseImg;

let selectionOne;
let selectionTwo;

let scaling = 2;

let inventory;

let mouseX, mouseY = 0;

let townWin, witchWin = false;

let players = {};
let objects = [];
let buildings = {};
let colliders = [];
let projectiles = [];
let myId;
let assignedTexture = "mainCharacter";
let playerRef = {};
let myName;
let playerWidth = 32;
let playerHeight = 32;

let messageBox = document.getElementById('message');
let speed = BASESPEED;
let lastMsg;

let spectators = {};

let items = {};

let keysPressed = {};

let amDead = false;

let transX, transY = 0;

let walkAnimLeft = new Animation(assignedTexture+"Left", 3, 100, 32*scaling, 32*scaling);
let walkAnimRight = new Animation(assignedTexture+"Right", 3, 100, 32*scaling, 32*scaling);

let gameticker; 
let spells = ['Blip', 'Hide', 'Imitation', 'Speed'];

let pName = document.getElementById('player-name');
let joinButton = document.getElementById('join-button');

let limit = 2;
let buttonSelected;

let ambients;

let joined = false;

let currentAmbient;
let ambTimer = false;

$('input.button-container').on('change', function(evt) {
    if($(this).siblings(':checked').length >= limit ||(!this.checked && curGame == Game.INGAME)) {
        this.checked = false;
    }else if(this.checked && curGame.INGAME){
        this.checked = true;
    }
 });

window.onload = function(){
    let background = new Rectangle(5000*scaling, 5000*scaling);
    background.setPosition(0-background.getWidth()/2, 0-background.getHeight()/2);
    add(background);
    walkAnimLeft.load();
    walkAnimRight.load();
    ctx = __graphics__.getContext();
    println("The checkboxes on the side are the spells you will have selected; YOU CAN SELECT TWO SPELLS! And will be the ones used if you become the witch this round!<br>"+
    "So Make sure they are what you want!!!<br>If you select nothing it will be selected at random!<br>You can change the selection but it wont change till the next round!<br>");
    mouseMoveMethod((e)=>{mouseX = e.getX(); mouseY = e.getY();});
    mouseDownMethod((e)=>{
        if (inventory.curItem != undefined && inventory.curItem.mouseClick != undefined && !amDead){
            inventory.curItem.activate();
        }
        if (playerRef.murderer && inventory.curSpell != null && inventory.curSpell.mouseClick){
            inventory.curSpell.activate();
        }else if(playerRef.murderer && inventory.curSpell != null && inventory.curSpell.onClick){
            inventory.curSpell.onClick();
        }
    });
    socket.on('init', (msg)=>{
        myId = socket.id;
        socket.emit('init', "hello");
        joinButton.onclick = function(){
            if (joined) return;
            joined = true;
            shoot = new Audio('audio/shoot.mp3');
            kill = new Audio('audio/kill.mp3');
            bell = new Audio('audio/bell.mp3');
            stun = new Audio('audio/stun.mp3');
            blip = new Audio('audio/blip.mp3');

            ambient1 = new Audio('audio/spiritdance.mp3');
            ambient2 = new Audio('audio/frael.mp3');
            ambient3 = new Audio('audio/Robes of Red - Shoppe.mp3');
            ambients = [ambient1, ambient2, ambient3];
            gameticker = setInterval(startGame, 20);
            gameOn = true;
            myName = determineName();
            let x = 0;
            let y = 0;
            assignedTexture = "mainCharacter";
            spawnPlayer(x, y, true);
            socket.emit('join', {
                x: x,
                y: y,
                direction: 'left',
                moving: false,
                hand: null,
                nickname: myName,
                characterName: assignedTexture,
                texture: assignedTexture,
            });
        };
        socket.on('chatMessageRec', (msg)=>{
            if (lastMsg != null && msg.nickname == lastMsg.nickname && msg.message == lastMsg.message) return;
            if (msg.message.length <= 0) return;
            if (currentChatChannel == msg.channel){
                println("<" + msg.sender.nickname.fontcolor("#ab8c00") + ">: " + "" + msg.message + "" + "<br>");
            }
            lastMsg = msg;
        });
    });
    socket.on('townWin', ()=>{
        townWin = true;
    });
    socket.on('endScreen', ()=>{
        gameOn = false;
        keysPressed = {};
        playerRef.spec = undefined;
        inventory.clear();
        playerRef.isDead = false;
        if(playerRef.animG != undefined && playerRef.animG.isOn) playerRef.animG.stop(playerRef.texture);
        amDead = false;
        selectionOne = null;
        selectionTwo = null;
        removeAll();
        let endScreen = new WebImage('textures/townWinScreen.png');
        if (witchWin){
            endScreen.setImage('textures/witchWinScreen.png');
        }else {
            endScreen.setImage('textures/townWinScreen.png');
        }
        endScreen.setSize(getWidth(), getHeight());
        endScreen.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/2-getWidth()/2, playerRef.texture.getY()+playerRef.texture.getHeight()/2-getHeight()/2);
        add(endScreen);
    });
    socket.on('witchWin',()=>{witchWin = true;});
    socket.on('playSound', (msg)=>{
        let sound; 
        switch(msg.sound){
            case 'blip':
                sound = blip;
                break;
            default:
                return;
        }
        sound.volume = calcVolume(msg.x, msg.y);
        sound.play();
    });
    socket.on('gameEnd', (msg)=>{
            removeAll();
            townWin = false;
            witchWin = false;
            let background = new Rectangle(5000*scaling, 5000*scaling);
            background.setPosition(0-background.getWidth()/2, 0-background.getHeight()/2);
            add(background);
            objects = [];
            buildings = {};
            colliders = [];
            if(inventory) inventory.reload();
            spawnPlayer(0, 0, false);
            parseMapData(mapDataObj);
            gameOn = true;
    });
    socket.on('startGame', (msg)=>{
        println("Game has Started!".fontcolor('#008800') + "<br>");
        processSpells();
        if (msg.murderer.id == myId){
            println("You are the Witch!".fontcolor('#660066') + "<br>");
            playerRef.murderer = true;
            inventory.enableWitchMode();
            inventory.addItem(new Knife(assignedTexture, 'left', scaling));
            inventory.addSpell(selectionOne);
            inventory.addSpell(selectionTwo);
        }else if(msg.detective.id == myId){
            println("You are the Hunter!".fontcolor("#0000ff") + "<br>");
            inventory.addItem(new Gun(scaling));
        }
        curGame = Game.INGAME;
    });
    socket.on('killed', (msg)=>{
        if(amDead) return;
        if(msg.customMessage) println(msg.customMessage.fontcolor('#770000') + "<br>");
        amDead = true;
        remove(playerRef.texture);
        remove(playerRef.hand);
        let x = playerRef.texture.getX();
        let y = playerRef.texture.getY();
        playerRef.texture = new WebImage("textures/ghost/char2_default.png");
        playerRef.animG = new Animation("ghost", 6, 100, 32*scaling, 32*scaling);
        playerRef.texture.setPosition(x, y);
        add(playerRef.texture);
        playerRef.animG.load();
        playerRef.animG.start(playerRef.texture);
    });
    socket.on('loadMap', (msg)=>{
        mapDataObj = msg;
        currentMap = msg.name;
        parseMapData(mapDataObj);
    });
    socket.on('stunned', (msg)=>{
        playerRef.stunned = true;
        let tempAnim = new Animation("stunned", 4, 100, 16*scaling, 16*scaling);
        playerRef.stunText = new WebImage('textures/stunned/char2_default.png');
        playerRef.stunText.setSize(32*scaling, 32*scaling);
        playerRef.stunText.setPosition(playerRef.texture.getX()+playerRef.texture.getWidth()/4, playerRef.texture.getY()-2*scaling);
        add(playerRef.stunText);
        tempAnim.load();
        tempAnim.start(playerRef.stunText);
        let tempInt = setInterval(()=>{remove(playerRef.stunText); add(playerRef.stunText);}, 10);
        setTimeout(()=>{
            playerRef.stunned = false;
            clearInterval(tempInt);
            tempAnim.stop(playerRef.stunText);
            remove(playerRef.stunText);
        }, msg.amount);
    });
    socket.on('joinMsg', (msg)=>{
        if (msg.player != undefined) println(msg.player.nickname.fontcolor("#008800") + " has joined the game!".fontcolor("#008800") + "<br>");
    });
    socket.on('leaveMsg', (msg)=>{
        println(msg.player.nickname.fontcolor("#550000") + " has left the game! <br>");
    });
    socket.on('gamestate', (msg)=>{
        if (!gameOn) return;
        inventory.gameStatus.setText(msg.curMode.toUpperCase() + ": " + msg.time);
        if (msg.curMode != curGame) {
            curGame = msg.curMode;
            if (msg.curMode == Game.INTERMISSION) inventory.clear();
        }
        for (const value in msg.players){
            if (value == myId){continue;}
            let cur = msg.players[value];
            if (players[value] == undefined){
                if (msg.players[value].chosen == false) continue;
                players[value] = cur;
                players[value].walkAnimLeft = new Animation(cur.texture+"Left", 3, 100, playerWidth*scaling, playerHeight*scaling);
                players[value].walkAnimRight = new Animation(cur.texture+"Right", 3, 100, playerWidth*scaling, playerHeight*scaling);
                players[value].walkAnimLeft.load();
                players[value].walkAnimRight.load();
                players[value].direction = cur.direction;
                players[value].characterName = cur.texture;
                if (players[value].hand == null)
                    players[value].hand = new WebImage("textures/items/"+players[value].characterName+"empty"+cur.direction+".png");
                else players[value].hand = new WebImage("textures/items/"+cur.hand+"/"+players[value].characterName+cur.hand+cur.direction+".png");
                players[value].textObj = new Text(cur.nickname, nameFont+fontSize);
                players[value].texture = new WebImage("textures/"+cur.characterName+cur.direction+"/char2_default.png");
                players[value].texture.setSize(playerWidth*scaling, playerHeight*scaling);
                players[value].hand.setSize(32*scaling, 32*scaling);
                players[value].hand.setPosition(cur.x, cur.y);
                players[value].texture.setPosition(cur.x, cur.y);
                players[value].textObj.setPosition(cur.x+players[value].texture.getWidth()/2-players[value].textObj.getWidth()/2, cur.y-players[value].textObj.getHeight()/2);
                add(players[value].texture);
                add(players[value].textObj);
                add(players[value].hand);
                layerPlayer(players[value]);
            }else {
                if (players[value] == undefined) continue;
                if (msg.players[value].chosen == false) {
                    remove(players[value].texture);
                    remove(players[value].hand);
                    remove(players[value].textObj);
                    continue;
                }
                players[value].moving = cur.moving;
                players[value].characterName = cur.characterName;
                players[value].x = cur.x;
                players[value].y = cur.y;
                players[value].invisible = cur.invisible;
                players[value].invis = cur.invisible;
                if (cur.disguised != null && cur.disguised != undefined && cur.disguised != false && !players[value].disInit){
                    let textName;
                    let tempChar;
                    if (cur.disguised != myId){ 
                        textName = players[cur.disguised].characterName; 
                        tempChar = players[cur.disguised].characterName;
                    }
                    else{ 
                        textName = myName;
                        tempChar = assignedTexture
                    }
                    players[value].walkAnimLeft = new Animation(tempChar+"Left", 3, 100, playerWidth*scaling, playerHeight*scaling);
                    players[value].walkAnimRight = new Animation(tempChar+"Right", 3, 100, playerWidth*scaling, playerHeight*scaling);
                    players[value].walkAnimLeft.load();
                    players[value].walkAnimRight.load();
                    players[value].textObj.setLabel(textName);
                    players[value].disInit = true;
                }else if(players[value].disInit && cur.disguised == false){
                    if(players[value].walkAnimLeft.isOn) players[value].walkAnimLeft.stop(players[value].texture);
                    if(players[value].walkAnimRight.isOn) players[value].walkAnimRight.stop(players[value].texture);
                    players[value].walkAnimLeft = new Animation(players[value].characterName+"Left", 3, 100, playerWidth*scaling, playerHeight*scaling);
                    players[value].walkAnimRight = new Animation(players[value].characterName+"Right", 3, 100, playerWidth*scaling, playerHeight*scaling);
                    players[value].walkAnimLeft.load();
                    players[value].walkAnimRight.load();
                    players[value].textObj.setLabel(players[value].nickname);
                    players[value].disInit = false;
                }
                if (!cur.invisible && players[value].invisInit){ 
                    players[value].invisInit = false;
                    add(players[value].texture);
                    add(players[value].hand);
                    add(players[value].textObj);
                }
                players[value].direction = cur.direction;
                players[value].isDead = cur.isDead;
                players[value].hand.setPosition(cur.x, cur.y);
                players[value].texture.setSize(playerWidth*scaling, playerHeight*scaling);
                players[value].texture.setPosition(cur.x, cur.y);
                players[value].textObj.setPosition(cur.x+players[value].texture.getWidth()/2-players[value].textObj.getWidth()/2, cur.y-players[value].textObj.getHeight()/2);
                if(cur.invisible && !players[value].invisInit){
                    remove(players[value].texture);
                    remove(players[value].hand);
                    remove(players[value].textObj);
                    players[value].invisInit = true;
                    return;
                }else if(cur.invisible){
                    return;
                }
                layerPlayer(players[value]);
                setTimeout(()=>{
                    if(players[value] == undefined) return;
                    if (cur.hand == null && players[value].hand != undefined){
                        players[value].hand.setImage("textures/items/"+players[value].characterName+"Empty"+cur.direction+".png");
                        players[value].hand.setSize(32*scaling, 32*scaling);
                    }else if (players[value].hand != undefined){
                        players[value].hand.setImage("textures/items/"+cur.hand+"/"+players[value].characterName+cur.hand+cur.direction+".png");
                        players[value].hand.setSize(32*scaling, 32*scaling);
                    }
                }, 100);
                remove(players[value].textObj);
                add(players[value].textObj);
                inventory.reload();
                if (players[value].moving){
                    if (players[value].walkAnimLeft.isOn || players[value].walkAnimRight.isOn){
                        if (players[value].direction == 'left' && players[value].walkAnimRight.isOn){
                            players[value].walkAnimLeft.start(players[value].texture);
                            players[value].walkAnimRight.stop(players[value].texture);
                        }else if (players[value].direction == 'right' && players[value].walkAnimLeft.isOn) {
                            players[value].walkAnimRight.start(players[value].texture);
                            players[value].walkAnimLeft.stop(players[value].texture);
                        }
                    }
                    if (players[value].direction == 'left') {
                        players[value].walkAnimLeft.start(players[value].texture);
                    }else if (players[value].direction == 'right'){
                        players[value].walkAnimRight.start(players[value].texture);
                    }
                }else if(players[value].walkAnimLeft.isOn || players[value].walkAnimRight.isOn){
                    if (players[value].walkAnimLeft.isOn) players[value].walkAnimLeft.stop(players[value].texture);
                    else if (players[value].walkAnimRight.isOn) players[value].walkAnimRight.stop(players[value].texture);
                }
            }
            if(cur.left){
                if (players[value].walkAnimRight.isOn) players[value].walkAnimRight.stop(players[value].texture);
                if(players[value].walkAnimLeft.isOn) players[value].walkAnimLeft.stop(players[value].texture);
                remove(players[value].texture);
                remove(players[value].textObj);
                remove(players[value].hand);
                delete players[value];
            }
            else if (cur.isDead){
                if (players[value].walkAnimRight.isOn) players[value].walkAnimRight.stop(players[value].texture);
                if(players[value].walkAnimLeft.isOn) players[value].walkAnimLeft.stop(players[value].texture);
                remove(players[value].texture);
                remove(players[value].textObj);
                remove(players[value].hand);
                kill.volume = calcVolume(players[value].texture.getX(), players[value].texture.getY());
                kill.play();
                let temp = players[value];
                delete players[value];
                if(cur.detective) continue;
                let tempDead = new WebImage('textures/dead.png');
                tempDead.setSize(32*scaling, 32*scaling);
                tempDead.setPosition(players[value].texture.getX(), players[value].texture.getY());
                add(tempDead);
                objects.push({ref:tempDead,dead:true,});
                for (let i = 0; i < objects.length; i++){
                    if(objects[i].type =='dead') continue;
                    checkDead(objects[i].ref);
                }
            }
        }
        for (const key in msg.items){
            let cur = msg.items[key];
            if (!items[key] && !msg.items[key].picked){
                items[key] = cur;
                items[key].text = new WebImage("textures/"+cur.name+"drop/char2_default.png");
                items[key].text.setPosition(cur.x-1000*scaling, cur.y-1000*scaling);
                items[key].text.setSize(16*scaling, 16*scaling);
                items[key].anim = new Animation(cur.name+"drop", 5, 200, 16*scaling, 16*scaling);
                items[key].anim.load();
                if(checkCords(items[key].text) && items[key].name != 'gun'){
                    socket.emit('itemInterfere', cur);
                    continue;
                }
                add(items[key].text);
                items[key].anim.start(items[key].text);
            }else if(items[key] != undefined){
                items[key].picked = cur.picked;
                if (items[key].picked) {
                    if(items.anim != undefined && items.anim.isOn) items.anim.stop(items[key].text);
                    remove(items[key].text);
                    delete items[key];
                }
            }
        }
        if (!amDead) return;
        for (const key in msg.spectators){
            if(key == myId) continue;
            let cur = msg.spectators[key];
            if (spectators[key] == undefined){
                spectators[key] = cur;
                spectators[key].spec = new WebImage("textures/ghost/char2_default.png");
                spectators[key].spec.setPosition(cur.x, cur.y);
                spectators[key].spec.setSize(32*scaling, 32*scaling);
                add(spectators[key].spec);
                spectators[key].specAnim = new Animation("ghost", 6, 100, 32*scaling, 32*scaling);
                spectators[key].specAnim.load();
                spectators[key].specAnim.start(spectators[key].spec);
                spectators[key].textObj = new Text(cur.nickname, nameFont+fontSize);
                spectators[key].textObj.setPosition(cur.x+spectators[key].spec.getWidth()/2-spectators[key].textObj.getWidth()/2, cur.y-spectators[key].textObj.getHeight()/2);
                add(spectators[key].textObj);
            }else {
                remove(spectators[key].textObj);
                add(spectators[key].textObj);
                spectators[key].spec.setPosition(cur.x, cur.y);
                spectators[key].textObj.setPosition(cur.x+spectators[key].spec.getWidth()/2-spectators[key].textObj.getWidth()/2, cur.y-spectators[key].textObj.getHeight()/2);
            }
            if (cur.left || cur.isDead == false){
                if(spectators[key].animG.isOn) spectators[key].animG.stop(playerRef.spec);
                remove(spectators[key].spec);
                remove(spectators[key].textObj);
                delete spectators[key];
            }
        }
    });
    socket.on('bullets', (msg)=>{
        for (const key in msg.bullet){
            let cur = msg.bullet[key];
            if (projectiles[key] == undefined){
                projectiles[key] = cur;
                projectiles[key].texture = new Circle(1*scaling);
                projectiles[key].texture.setPosition(cur.x, cur.y);
                if (cur.amount == undefined) cur.amount = 0;
                projectiles[key].texture.move(cur.moveX*cur.amount, cur.moveY*cur.amount);
                if (cur.amount == 1){
                    //println(cur.x + " " + cur.y + " " + playerRef.texture.getX() + " " + playerRef.texture.getY() + "<br>");
                    let vol = 1/(distance(cur.x, cur.y, playerRef.texture.getX(), playerRef.texture.getY())/100);
                    if (vol > 1) vol = 1;
                    else if(vol < 0.1) vol = 0;
                    shoot.volume = vol;
                    shoot.play();
                }
                add(projectiles[key].texture);
            }else if(projectiles[key] != undefined){
                if (cur.amount == 1){
                    //println(cur.x + " " + cur.y + " " + playerRef.texture.getX() + " " + playerRef.texture.getY() + "<br>");
                    let vol = 1/(distance(cur.x, cur.y, playerRef.texture.getX(), playerRef.texture.getY())/100);
                    if(vol > 1) vol = 1;
                    else if(vol < 0.1) vol = 0;
                    shoot.volume = vol;
                    shoot.play();
                }
                checkProj(projectiles[key]);
                projectiles[key].texture.move(cur.moveX, cur.moveY);
                remove(projectiles[key].texture);
                add(projectiles[key].texture);
            }
            if (cur.delete){
                remove(projectiles[key].texture);
                delete projectiles[key];
            }
        }
    });

    socket.on('stunSound', (msg)=>{
        stun.volume = calcVolume(msg.x, msg.y);
        stun.play();
    });

    function start(){
        
    }
    if (typeof start === 'function'){
        start();
    }

};

function distance(x, y, x1, y1){
    let dist = ((x-x1)**2) + ((y-y1)**2);
    return Math.sqrt(dist);
}

function parseMapData(mapObj){
    baseImg = new WebImage("textures/" + mapObj.name + "/" + "base.png");
        baseImg.setSize(mapObj.width*scaling, mapObj.height*scaling);
        baseImg.setPosition(0-baseImg.getWidth()/2, 0-baseImg.getHeight()/2);
        add(baseImg);
        for (let i = 0; i < mapObj.objects.length; i++){
            let cur = mapObj.objects[i];
            for (let pos = 0; pos < cur.positions.length; pos++){    
                let temp;
                let tempObj;
                if (cur.type != 'collider') {
                    temp = new WebImage("textures/"+mapObj.name+"/"+cur.name+".png");
                    tempObj = {ref:temp, type:cur.type};
                    temp.setSize(cur.width*scaling, cur.height*scaling);
                    temp.setPosition(cur.positions[pos][0]*scaling, cur.positions[pos][1]*scaling);
                }
                if (cur.type != 'collider'){
                    if(cur.collisions != undefined) tempObj['collisions'] = cur.collisions;
                    else tempObj['collisions'] = false;
                    if (cur.topOffset != undefined) tempObj.topOffset = cur.topOffset;
                    else tempObj.topOffset = 0;
                    if (cur.bottomOffset != undefined) tempObj.bottomOffset = cur.bottomOffset;
                    else tempObj.bottomOffset = 0;
                }
                if (cur.type != 'collider') add(temp);
                if (cur.type == 'building'){
                    buildings[cur.name] = tempObj;
                }else if(cur.type == 'collider'){
                    colliders.push({x: cur.positions[pos][0]*scaling, y:cur.positions[pos][1]*scaling, width:cur.width*scaling, height:cur.height*scaling});
                }else {
                    objects.push(tempObj);
                }
                if (cur.animated != undefined){
                    objects[objects.indexOf(tempObj)].animated = new Animation(cur.animated, cur.frames, 100, cur.width*scaling, cur.height*scaling);
                    objects[objects.indexOf(tempObj)].animated.load();
                    objects[objects.indexOf(tempObj)].animated.start(temp);
                }
            }
        }
        if(!gameOn && playerRef.texture == undefined) return;
        if(!amDead){
            remove(playerRef.hand);
            remove(playerRef.texture);
            remove(playerRef.textObj);
            add(playerRef.texture);
            add(playerRef.hand);
            add(playerRef.textObj);
        }
        for (const key in players){
            remove(players[key].texture);
            remove(players[key].hand);
            add(players[key].texture);
            add(players[key].hand);
        }
        inventory.reload();
}

function calcVolume(x, y){
    let vol = 1/(distance(x, y, playerRef.texture.getX(), playerRef.texture.getY())/100);
    if(vol > 1) vol = 1;
    else if(vol < 0.1) vol = 0;
    return vol;
}   

function spawnPlayer(x, y, firstSpawn){
    let prevX, prevY;
    if (firstSpawn == false){
        prevX = playerRef.texture.getX();
        prevY = playerRef.texture.getY();
        playerRef = undefined;
    }
    playerRef = {
        id: myId,
        x: x,
        y: y,
        hand: new WebImage("textures/items/"+assignedTexture+"EmptyLeft.png"),
        nickname: myName,
        direction: 'left',
        moving: false,
        texture: new WebImage("textures/"+assignedTexture+"Left"+"/char2_default.png"),
        murderer: false,
        detectice: false,
    };
    currentChatChannel = 'global';
    transX = -x+getWidth()/2;
    transY = -y+getHeight()/2;
    playerRef.texture.setPosition(x, y);
    playerRef.hand.setPosition(x, y);
    playerRef.hand.setSize(32*scaling, 32*scaling);
    playerRef.texture.setSize(32*scaling,32*scaling);
    inventory = new Inventory();
    let tempX = x-prevX;
    let tempY = y-prevY;
    if(firstSpawn) ctx.translate(-x-playerRef.texture.getWidth()/2+getWidth()/2, -y-playerRef.texture.getHeight()/2+getHeight()/2);
    else ctx.translate(-tempX, -tempY);
    add(playerRef.hand);
    add(playerRef.texture);
    playerRef.textObj = new Text(myName, nameFont+fontSize);
    playerRef.textObj.setPosition(x+playerRef.texture.getWidth()/2-playerRef.textObj.getWidth()/2, y-playerRef.textObj.getHeight()/2);
    add(playerRef.textObj);
    processSpells();
}

function processSpells(){
    let count = 0;
    selectionOne = null; selectionTwo = null;
    for (let i = 0; i < spells.length; i++){
        if (count == 2) break;
        let cur = document.getElementById(spells[i]);
        if (cur.checked){
            if (count == 0) selectionOne = spells[i];
            else selectionTwo = spells[i];
            count++;
        }
    }
    if (!selectionOne){
        selectionOne = randomSpell();
    }
    if (!selectionTwo){
        selectionTwo = randomSpell();
        if (selectionTwo == selectionOne){
            selectionTwo = spells[(spells.indexOf(selectionOne)+1) % spells.length];
        }
    }
    selectionOne = spellSwitch(selectionOne);
    selectionTwo = spellSwitch(selectionTwo);
}

function checkProj(proj){
    for (const key in buildings){
        if (overlap(proj.texture, buildings[key].ref)){
            socket.emit('removeProj', {id: proj.id});
        }
    }
    for (let i = 0; i < colliders.length; i++){
        if (colliders[i].x < proj.texture.getX() && colliders[i].x+colliders[i].width > proj.texture.getX() && colliders[i].y < proj.texture.getY() && colliders[i].y+colliders[i].height > proj.texture.getY()){
            socket.emit('removeProj', {id: proj.id});
        }
    }
    for (let i = 0; i < objects.length; i++){
        if(!objects[i].collisions) continue;
        if (overlap(proj.texture, objects[i].ref)){
            socket.emit('removeProj', {id: proj.id});
        }
    }
}

function randomSpell(){
    return spells[Randomizer.nextInt(0, spells.length-1)];
}

function spellSwitch(exp){
    switch (exp){
        case 'Imitation':
            return new Disguise();
        case 'Hide':
            return new HideSpell();
        case 'Blip':
            return new Blip();
        case 'Speed':
            return new Speed();
    }
}

function checkCords(obj){
    for (const key in buildings){
        let cur = buildings[key].ref;
        if (overlap(cur, obj)){
            return true;
        }
    }
    for (let i = 0; i < objects.length; i++){
        let cur = objects[i].ref;
        if (!cur.collisions) {
            remove(cur);
            add(cur);
            continue;
        }
        if (overlap(obj, cur)) return true;
    }
    for (let i = 0; i < colliders.length; i++){
        let cur = colliders[i];
        let cX = obj.getX()+obj.getWidth()/2;
        let cY = obj.getY()+obj.getHeight()/2;
        if (cX >= cur.x && cX < cur.x+cur.width && cY >= cur.y && cY <= cur.y+cur.height){
            return true;
        }
    }
}

function switchNums(expression){
    switch(expression){
        case '!':
            return '1';
        case '@':
            return '2';
        case '#':
            return '3';
        case '$':
            return '4';
        case '%':
            return '5';
        case '^':
            return '6';
    }
}

function overlap(obj1, obj2){
        // If one rectangle is on left side of other
        if (obj1.getX() >= obj2.getX()+obj2.getWidth() || obj2.getX() >= obj1.getX()+obj1.getWidth()) {
            return false;
        }
        // If one rectangle is above other
        if (obj1.getY()+obj1.getHeight() <= obj2.getY() || obj2.getY()+obj2.getHeight() <= obj1.getY()) {
            return false;
        }
        return true;
}

function checkRef(cur){
    if (amDead) return false;
    if (overlap(playerRef.texture, cur)){
        if (playerRef.texture.getY()+playerRef.texture.getHeight() >= cur.getY()+cur.getHeight()){
            remove(playerRef.texture);
            remove(playerRef.hand);
            add(playerRef.texture);
            add(playerRef.hand);
            inventory.reload();
        }
    }
}

function checkDead(obj){
    for (let i = 0; i < objects.length; i++){
        if (!objects[i].dead) continue;
        if (overlap(objects[i].ref, obj)){
            if(objects[i].ref.getY()+objects[i].ref.getHeight() > obj.getY()+obj.getHeight()){
                remove(obj);
                add(obj);
            }
            return;
        }
    }
}

function layerPlayer(player){
    let layered = false;
    if (amDead) return;
    for (const key in buildings){
        let p = player.texture;
        let cur = buildings[key].ref;
        if (overlap(p, cur)&& !cur.invis){
            if (player.layered != undefined && player.layered == cur) {
                if (player.below && p.getY()+p.getHeight() >= cur.getY()+cur.getHeight()){
                    remove(p);
                    add(p);
                    remove(player.hand);
                    add(player.hand);
                    inventory.reload();
                    player.below = false;
                    player.above = true;
                }else if (player.above && p.getY()+p.getHeight() < cur.getY()+cur.getHeight()){
                    player.below = true;
                    player.above = false;
                    remove(cur);
                    add(cur);
                    checkDead(cur);
                    checkRef(cur);
                    for (const key in players){
                        let cur1 = players[key];
                        if (overlap(cur1.texture, cur) && !cur1.invis){
                            if (cur1.texture.getY()+cur1.texture.getHeight() >= cur.getY()+cur.getHeight()){
                                remove(cur1.texture);
                                remove(cur1.hand);
                                add(cur1.texture);
                                add(cur1.hand);
                                inventory.reload();
                            }
                        }
                    }
                    inventory.reload();
                }
                return;
            }
            player.layered = cur;
            if (p.getY()+p.getHeight() < cur.getY()+cur.getHeight()){
                remove(cur);
                add(cur);
                player.below = true;
                checkDead(cur);
                checkRef(cur);
                for (const key in players){
                    let cur1 = players[key];
                    if (overlap(cur1.texture, cur) && !cur1.invis){
                        if (cur1.texture.getY()+cur1.texture.getHeight() >= cur.getY()+cur.getHeight()){
                            remove(cur1.texture);
                            remove(cur1.hand);
                            add(cur1.texture);
                            add(cur1.hand);
                            inventory.reload();
                        }
                    }
                }
                inventory.reload();
            }else if(!p.invisible){
                remove(p);
                add(p);
                remove(player.hand);
                add(player.hand);
                player.above = true;
                inventory.reload();
            }
            layered = true;
        }else {
            if (player.layered != undefined && player.layered == cur){ 
                player.layered = null;
                player.above = false;
                player.below = false;
            }
        }
    }
    for (let i = 0; i < objects.length; i++){
        let cur = objects[i].ref;
        if (objects[i].dead) continue;
        let p = player.texture;
        if (overlap(p, cur)){
            if (player.layered != undefined && player.layered == cur) {
                if (player.below && p.getY()+p.getHeight() >= cur.getY()+cur.getHeight()){
                    checkDead(cur);
                    remove(p);
                    add(p);
                    remove(player.hand);
                    add(player.hand);
                    inventory.reload();
                    player.below = false;
                    player.above = true;
                }else if (player.above && p.getY()+p.getHeight() < cur.getY()+cur.getHeight() && objects[i].type != 'dead'){
                    player.below = true;
                    player.above = false;
                    remove(cur);
                    add(cur);
                    checkDead(cur);
                    checkRef(cur);
                    for (const key in players){
                        let cur1 = players[key];
                        if(cur1.invisible) continue;
                        if (overlap(cur1.texture, cur) && !cur.invis){
                            if (cur1.texture.getY()+cur1.texture.getHeight() >= cur.getY()+cur.getHeight()){
                                checkDead(cur);
                                remove(cur1.texture);
                                remove(cur1.hand);
                                add(cur1.texture);
                                add(cur1.hand);
                                inventory.reload();
                            }
                        }
                    }
                    inventory.reload();
                }
                //return;
                break;
            }
            player.layered = cur;
            if (p.getY()+p.getHeight() < cur.getY()+cur.getHeight() && objects[i].type != 'dead'){
                remove(cur);
                add(cur);
                checkDead(cur);
                player.below = true;
                checkRef(cur);
                for (const key in players){
                    let cur1 = players[key];
                    if(cur1.invisible) continue;
                    if (overlap(cur1.texture, cur)){
                        if (cur1.texture.getY()+cur1.texture.getHeight() >= cur.getY()+cur.getHeight()){
                            checkDead(cur);
                            remove(cur1.texture);
                            remove(cur1.hand);
                            add(cur1.texture);
                            add(cur1.hand);
                            inventory.reload();
                        }
                    }
                }
                inventory.reload();
            }else {
                player.above = true;
                checkDead(cur);
                remove(player.texture);
                add(player.texture);
                remove(player.hand);
                add(player.hand);
                inventory.reload();
            }
            layered = true;
        }else{
            if (player.layered != undefined && player.layered == cur){ 
                player.layered = null;
                player.above = false;
                player.below = false;
            }
        }
    }
    for (const key in players){
        let cur = players[key];
        let p = player.texture;
        if (cur.id == player.id) continue;
        cur = players[key].texture;
        if (key == myId) println("layering!<br>");
        if(cur.invisible) continue;
        if (overlap(p, cur) && !cur.invisible){
            if (player.pLayered != undefined && player.pLayered == cur) {
                if (player.pBelow && p.getY()+p.getHeight() >= cur.getY()+cur.getHeight()){
                    remove(p);
                    add(p);
                    remove(player.hand);
                    add(player.hand);
                    inventory.reload();
                    player.pBelow = false;
                    player.pAbove = true;
                    if (player.layered != undefined && player.below && !player.above) {
                        remove(player.layered);
                        add(player.layered);
                    }
                }else if (player.pAbove && p.getY()+p.getHeight() < cur.getY()+cur.getHeight() && !cur.invis){
                    player.pBelow = true;
                    player.pAbove = false;
                    remove(cur);
                    add(cur);
                    remove(players[key].hand);
                    add(players[key].hand);
                    if (cur.layered != undefined && cur.below && !cur.above){
                        remove(cur.layered);
                        add(cur.layered);
                    }
                    for (const key in players){
                        let cur1 = players[key];
                        if(cur1.invis) continue;
                        if (overlap(cur1.texture, cur) && !cur.invis && !cur1.invis){
                            if (cur1.texture.getY()+cur1.texture.getHeight() >= cur.getY()+cur.getHeight()){
                                remove(cur1.texture);
                                remove(cur1.hand);
                                add(cur1.texture);
                                add(cur1.hand);
                                if (cur1.layered != undefined && cur1.below && !cur1.above){
                                    remove(cur1.layered);
                                    add(cur1.layered);
                                }
                                inventory.reload();
                            }
                        }
                    }
                    inventory.reload();
                }
                return;
            }
            player.pLayered = cur;
            if (p.getY()+p.getHeight() < cur.getY()+cur.getHeight() && !cur.invis){
                remove(cur);
                add(cur);
                remove(players[key].hand);
                add(players[key].hand);
                checkRef(cur);
                for (const key in players){
                    let cur1 = players[key];
                    if(cur1.invisible) continue;
                    if (overlap(cur1.texture, cur) && !cur1.invisible && !cur.invisible){
                        if (cur1.texture.getY()+cur1.texture.getHeight() >= cur.getY()+cur.getHeight()){
                            remove(cur1.texture);
                            remove(cur1.hand);
                            add(cur1.texture);
                            add(cur1.hand);
                            if (cur1.layered != undefined && cur1.below && !cur1.above){
                                remove(cur1.layered);
                                add(cur1.layered);
                            }
                            inventory.reload();
                        }
                    }
                }
                player.pBelow = true;
                player.pAbove = false;
                inventory.reload();
            }else if(!p.invisible){
                remove(p);
                add(p);
                remove(player.hand);
                add(player.hand);
                if (player.layered != undefined && player.below && !player.above) {
                    remove(player.layered);
                    add(player.layered);
                }
                player.pAbove = true;
                player.pBelow = false;
                inventory.reload();
            }
        }
    }
}

let messageOnHold = false;
let messageContents;

function reloadHand(){
    if (inventory.curItem == null) {
        playerRef.hand.setImage("textures/items/"+assignedTexture+"empty"+playerRef.direction+".png");
    }else {
        playerRef.hand.setImage("textures/items/"+inventory.curItem.name+"/"+assignedTexture+inventory.curItem.name+playerRef.direction+".png");
    }
    playerRef.hand.setSize(32*scaling, 32*scaling);
}

addEventListener('keydown', (e)=>{
    if(!gameOn) return;
    if (document.activeElement == messageBox) return;
    keysPressed[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() == 'e'){
        if (inventory.curItem != null && inventory.curItem.mouseClick == undefined && !amDead){
            inventory.curItem.activate();
        }
    }
    if(e.key.toLowerCase() == 'f'){
        if (inventory.curSpell != null && playerRef.murderer){
            inventory.curSpell.activate();
        }
    }
    if(e.key == 'ArrowUp' && playerRef.murderer){
        inventory.selectSpell(1);
        e.preventDefault();
    }else if(e.key == 'ArrowDown' && playerRef.murderer){
        inventory.selectSpell(2);
        e.preventDefault();
    }else if(e.key == 'ArrowLeft'){
        if (inventory.selectedSlot == null || inventory.selectedSlot == undefined) inventory.selectedSlot = 0;
        if(inventory.selectedSlot == 0){
            inventory.selectSlot(6);
        }else {
            inventory.selectSlot(inventory.selectedSlot);
        }
        e.preventDefault();
        reloadHand();
    }else if(e.key == 'ArrowRight'){
        if (inventory.selectedSlot == null || inventory.selectedSlot == undefined) inventory.selectedSlot = 0;
        inventory.selectSlot(((inventory.selectedSlot+1)%6)+1);
        reloadHand();
        e.preventDefault();
    }
    if (e.key == '1' || e.key == '2' || e.key == '3' || e.key == '4' || e.key == '5' || e.key == '6'
    || e.key == '!' || e.key == '@' || e.key == '#' || e.key == '$' || e.key == '%' || e.key == '^'){
        let ex = parseInt(e.key);
        if(e.key == '!' || e.key == '@' || e.key == '#' || e.key == '$' || e.key == '%' || e.key == '^') ex = parseInt(switchNums(e.key));
        inventory.selectSlot(parseInt(ex));
        reloadHand();
    }
    if(amDead) return;
    if (e.key.toLowerCase() == 'a') {
        playerRef.direction = 'left';
        if (walkAnimRight.isOn){
            walkAnimRight.stop();
        }
    }
    else if (e.key.toLowerCase() == 'd'){
        playerRef.direction = 'right';
        if (walkAnimLeft.isOn){
            walkAnimLeft.stop();
        }
    }
    if (keysPressed.w || keysPressed.s || keysPressed.a || keysPressed.d){
        playerRef.moving = true;
    }
    if (!keysPressed.w && !keysPressed.s && !keysPressed.a && !keysPressed.d) return;
    if(playerRef.direction == 'left') walkAnimLeft.start(playerRef.texture);
    else if(playerRef.direction == 'right') walkAnimRight.start(playerRef.texture);
    setTimeout(()=>{    
        if (inventory.curItem == null) {
            playerRef.hand.setImage("textures/items/"+assignedTexture+"empty"+playerRef.direction+".png");
        }else {
            playerRef.hand.setImage("textures/items/"+inventory.curItem.name+"/"+assignedTexture+inventory.curItem.name+playerRef.direction+".png");
        }
        playerRef.hand.setSize(32*scaling, 32*scaling);
    }, 100);
});
addEventListener('keyup', (e)=>{
    if(!gameOn) return;
    keysPressed[e.key.toLowerCase()] = false;
    if (e.key == 'Enter'){
        if (messageOnHold){
            messageContents = messageBox.value.trim();
            messageBox.value = null;
            messageOnHold = false;
            return;
        }
        if (messageBox.value == null || messageBox.value.trim().length <= 0) return;
        socket.emit('chatMessage', {
            message: messageBox.value,
            channel: currentChatChannel,
            sender: playerRef,
        });
        messageBox.value = null;
        messageBox.disabled = true;
        messageBox.disabled = false;
        return;
    }
    if(e.key == 'shift') speed = BASESPEED;
    if (keysPressed.w || keysPressed.s || keysPressed.a || keysPressed.d){
        return;
    }
    playerRef.moving = false;
    if(playerRef.direction == 'left') setTimeout(()=>{
        walkAnimLeft.stop(playerRef.texture);
    }, 100);
    else if(playerRef.direction == 'right') setTimeout(()=>{
        walkAnimRight.stop(playerRef.texture);
    }, 100);
});

function randomNum(min, max){
    return Math.floor(Math.random()*max+1-min)+min;
}

function determineName(){
    if (pName.value != null && pName.value.length > 0){
        return pName.value.trim();
    }else {
        return "Guest-" + randomNum(1, 9999).toString();
    }
}

function checkMovement(direction){
    let p = playerRef.texture;
    let y = p.getY()+p.getHeight();
    let x = p.getX()+p.getWidth()/2;
    if (direction == 'left'){
        x-=speed;
    }
    if (direction == 'right'){
        x+=speed;
    }
    if (direction == 'up'){
        y-=speed;
    }
    if(direction == 'down'){
        y+=speed;
    }
    for (let i = 0; i < objects.length; i++){
        let cur = objects[i];
        if (!cur.collisions) continue;
        cur = cur.ref;
        let obj = objects[i];
        if (x > cur.getX() && cur.getX()+cur.getWidth() > x && y < cur.getY()+cur.getHeight()-obj.bottomOffset*scaling && y > cur.getY()+obj.topOffset*scaling){
            return true;
        }
    }
    for (const key in buildings){
        let obj = buildings[key];
        let cur = buildings[key].ref;
        if (x > cur.getX() && cur.getX()+cur.getWidth() > x && y < cur.getY()+cur.getHeight()-obj.bottomOffset*scaling && y > cur.getY()+obj.topOffset*scaling){
            return true;
        }
    }
    for (let i = 0; i < colliders.length; i++){
        let cur = colliders[i];
        if (x > cur.x && x < cur.x+cur.width && y > cur.y && y < cur.y+cur.height){
            return true;
        }
    }
    return false;
}

function checkBullets(){
    if(amDead) return;
    for (const key in projectiles){
        let cur = projectiles[key].texture;
        if(cur == undefined) continue;
        if(projectiles[key].origin == myId) continue;
        if (cur.getX() < playerRef.texture.getX() || cur.getX() > playerRef.texture.getX()+playerRef.texture.getWidth()) continue;
        if (cur.getY() < playerRef.texture.getY() || cur.getY() > playerRef.texture.getY()+playerRef.texture.getHeight()) continue;
        socket.emit('playerKilled', {playerKilled: myId, projId: key,});
        remove(cur);
        delete projectiles[key];
    }
}

let lastItemPicked;

function checkItems(){
    for (const key in items){
        let cur = items[key];
        if (overlap(playerRef.texture, cur.text) && lastItemPicked != items[key]){
            if (inventory.isFull()) return;
            if (cur.name == 'gun' && playerRef.murderer) continue;
            if (cur.tpicked) continue;
            socket.emit('itemInterfere', {id: cur.id,});
            let itemToAdd;
            items[key].tpicked = true;
            if(playerRef.murderer) return;
            switch(cur.name.toLowerCase()){
                case 'milk':
                    itemToAdd = new Milk(scaling);
                    break;
                case 'opium':
                    itemToAdd = new Opium(scaling);
                    break;
                case 'stick':
                    itemToAdd = new Stick(scaling);
                    break;
                case 'gun':
                    itemToAdd = new Gun(scaling);
            }
            inventory.addItem(itemToAdd);
        }
    }
}

function startGame(){
    if(!gameOn){
        if (!currentAmbient && !currentAmbient.paused){
            currentAmbient.pause();
            currentAmbient = null;
        }
        return;
    }
    if (currentAmbient == null){
        let rand = Randomizer.nextInt(0, ambients.length-1);
        currentAmbient = ambients[rand];
        currentAmbient.volume = 0.5;
        currentAmbient.play();
    }else if(currentAmbient.paused && !ambTimer){
        ambTimer = true;
        setTimeout(()=>{
            ambTimer = false;
            currentAmbient = null;
        }, Randomizer.nextInt(5000, 20000));
    }
    if (inventory.curItem != null && inventory.curItem.inHand != undefined) inventory.curItem.inHand();
    if (playerRef.stunned != true){
        if (keysPressed['shift'] && !regen && curStamina > 0){ 
            speed = BASESPEED*1.5;
            curStamina -= staminaUsage;
        }else if(curStamina < maxStamina){
            speed = BASESPEED;
            curStamina += staminaRegenRate;
            if (curStamina <= 0) {regen = true; inventory.stamina.setColor(Color.yellow);}
        }else if(curStamina >= maxStamina && regen){
            speed = BASESPEED;
            regen = false;
            inventory.stamina.setColor(Color.blue);
        }
        if (keysPressed['w'] && !checkMovement('up')){
            playerRef.texture.move(0, -speed);
            playerRef.textObj.move(0, -speed);
            ctx.translate(0, speed);
            transY--;
        }
        if(keysPressed['s'] && !checkMovement('down')){
            playerRef.texture.move(0, speed);
            playerRef.textObj.move(0, speed);
            ctx.translate(0, -speed);
            transY++;
        }
        if(keysPressed['a'] && !checkMovement('left')){
            playerRef.texture.move(-speed, 0);
            playerRef.textObj.move(-speed, 0);
            ctx.translate(speed, 0);
            transX--;
        }
        if (keysPressed['d'] && !checkMovement('right')){
            playerRef.texture.move(speed, 0);
            playerRef.textObj.move(speed, 0);
            ctx.translate(-speed, 0);
            transX++;
        }
    }
    checkBullets();
    if(!amDead) checkItems();
    if(!amDead) playerRef.hand.setPosition(playerRef.texture.getX(), playerRef.texture.getY());
    if(!amDead) layerPlayer(playerRef);
    remove(playerRef.textObj);
    add(playerRef.textObj);
    inventory.reload();
    inventory.rePos(playerRef);
    __graphics__.redraw();
    let handExport;
    if (inventory.curItem != null) handExport = inventory.curItem.name;
    else handExport = null;
    socket.emit('pos', {
        id: myId,
        direction: playerRef.direction,
        x: playerRef.texture.getX(),
        y: playerRef.texture.getY(),
        texture: assignedTexture,
        hand: handExport,
        isDead: amDead,
        moving: playerRef.moving,
    });
}