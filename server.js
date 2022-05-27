const express = require("express");
const app = express();
const fs = require('fs');
const xss = require('xss');
const process = require("dotenv");
const httpModule = require('http');
const http = httpModule.createServer(app);
const path = require('path');
const io = require("socket.io")(http, {cors: {origin: "*"}});
const uuid = require('uuid');
const SCALING =2;
const COUNT = 20;

const ITEM_DESPAWN = 60000;

var filter = {
    whiteList: {}, // empty, means filter out all tags
    stripIgnoreTag: true, // filter out all HTML not in the whitelist
    stripIgnoreTagBody: ["script"], // the script tag is a special case, we need
    // to filter out its content
};

const PORT = 5000;
const HOST = "http://localhost";
const GAMETICKS = 50;
const ROUND_LENGTH = 20;

let players = {};
let projectiles = {};
let items = {};
let spectators = {};
let onlinePlayers = 0;
let objects = {};
let gameTick = false;
let selectedMap = 'salem';

let minPlayers = 2;

let alive = 0;

let countDown = COUNT;

let Game = {
    INTERMISSION : "intermission",
    INGAME : "ingame",
};

let curGame = Game.INTERMISSION;

let mapObj;

let murderer, detective;
let countStarted = false;

let gameTicker;

let timer;

let temp = "{cors: {origin: "*"}}";

app.get('/', (req, resp)=>{
    resp.sendFile(__dirname + "/index.html");
    app.use(express.static(__dirname + '/'));
});
app.get('/classes', (req, resp)=>{
    app.use(express.static(__dirname + "/classes/"));
});
app.get('/textures', (req, resp)=>{
    //app.use(express.static(__dirname + "/textures/"));
    app.use(express.static(path.join(__dirname, 'public')));
});

let lastKill;

let itemSelection = [{name: 'milk', chance: 40}, {name: 'opium', chance: 30}, { name:'stick', chance:30}];

function getRandom(){
    return Math.random().toString().substring(2, 20);
}

io.on('connection', socket =>{
    console.log("Connected!");
    if (players[socket.id] != undefined){
        
    }
    socket.on('init', (message)=>{
        console.log("Recieved initialization");
    });
    socket.on('doneLoading', (msg)=>{
        
    });
    socket.on('sound', (msg)=>{
        io.emit('playSound', {x: msg.x, y: msg.y, sound: msg.audio,});
    });
    socket.on('join', (msg)=>{
        if(players[socket.id]) return;
        console.log(msg.nickname + " has joined the game!");
        let temp = {
            id: socket.id,
            x: msg.x,
            y: msg.y,
            texture: msg.texture,
            hand: msg.hand,
            nickname: msg.nickname,
            characterName: msg.characterName,
            moving: msg.moving,
            direction: msg.direction,
            isDead: false,
            murderer: false,
            detective: false,
        };
        if (curGame == Game.INTERMISSION){
            players[socket.id] = temp;
        }else if(curGame == Game.INGAME){
            spectators[socket.id] = temp;
            io.to(socket.id).emit('killed', {});
        }
        onlinePlayers++;
        if (onlinePlayers >= minPlayers && (timer == undefined || timer == null)){
            timer = setInterval(timeCount, 1000);
        }
        if (onlinePlayers > 0 && !gameTick){
            gameTicker = setInterval(startGameTick, GAMETICKS);
            gameTick = true;
            console.log("Game started!");
        }
        let playerJoined = players[socket.id];
        if (playerJoined == undefined && !spectators[socket.id]) playerJoined = spectators[socket.id]; 
        io.emit('joinMsg', {
            player: playerJoined,
        });
        let mapDataFile = "";
        try {
            const data = fs.readFileSync("textures/salem/data.json", "utf8");
            mapDataFile += data;
        }catch(err){
            console.log("error reading map file");
        }
        mapObj = JSON.parse(mapDataFile);
        io.to(socket.id).emit('loadMap', JSON.parse(mapDataFile));
    });
    socket.on('chatMessage', (msg)=>{
        let cleanedMessage = xss(msg.message, filter);
        let tempMsg = msg;
        tempMsg.message = cleanedMessage;
        io.emit('chatMessageRec', tempMsg);
    });
    socket.on('pos', (msg)=>{
        if(players[msg.id] == undefined && spectators[msg.id] == undefined) return; 
        if(!msg.isDead && players[msg.id] != undefined){
            players[msg.id].x = msg.x;
            players[msg.id].y = msg.y;
            players[msg.id].hand = msg.hand;
            players[msg.id].moving = msg.moving;
            players[msg.id].direction = msg.direction;
            players[msg.id].texture = msg.texture;
        }else if(spectators[msg.id] != undefined){
            spectators[msg.id].x = msg.x;
            spectators[msg.id].y = msg.y;
        }
        if(spectators[msg.id] != undefined && !msg.isDead){
            io.to(msg.id).emit('killed',{});
        }
    });
    socket.on('removeProj', (msg)=>{
        if(!projectiles[msg.id]) return;
        projectiles[msg.id].delete = true;
        setTimeout(()=>{delete projectiles[msg.id];}, 100);
    });
    io.to(socket.id).emit('init', {data: "hello world"});
    socket.on('shoot', (msg)=>{
        let projectilesId = getRandom();
        let temp = {
            id: projectilesId,
            x: msg.x,
            y: msg.y,
            origin: msg.origin,
            moveX: msg.moveX,
            moveY: msg.moveY,
        };
        projectiles[projectilesId] = temp;
    });
    socket.on('disguise', (msg)=>{
        if (msg.value){ 
            players[msg.id].disguised = msg.disguiseID;
            players[msg.id].characterName = players[msg.disguiseID].characterName;
        }
        else{ 
            players[msg.id].disguised = false;
            players[msg.id].characterName = players[msg.id].texture;
        }
    });
    socket.on('invisible', (msg)=>{
        players[msg.id].invisible = msg.value;
    });
    socket.on('playerKilled', (msg)=>{
        if (lastKill == msg.playerKilled) return;
        let playerKilled = players[msg.playerKilled];
        spectators[msg.playerKilled] = playerKilled;
        players[msg.playerKilled].isDead = true;
        alive--;
        socket.to(msg.playerKilled).emit('killed', {});
        if (msg.projId != undefined){
            if (msg.playerKilled != murderer.id) io.emit('killed', {customMessage:"You killed an innocent person! <br> you're not the murderer, your a symbol of justice you fiend!"});
            projectiles[msg.projId].delete = true;
            alive--;
            setTimeout(()=>{delete projectiles[msg.projId];}, 100);
        }
        if (msg.playerKilled == detective.id){
            let id = uuid.v4();
            players[msg.playerKilled].detective = true;
            //console.log(players[msg.playerKilled].x, players[msg.playerKilled].y);
            items[id] = {x: players[msg.playerKilled].x+mapObj.width/2*SCALING, y: players[msg.playerKilled].y+mapObj.height/2*SCALING, name: 'gun', id: id, created: Date.now(), neverDespawn:false,};
        }
        if (msg.playerKilled == murderer.id){
            countDown = 2;
            io.emit('townWin', {});
        }else if (alive < 2){
            countDown = 2;
            if(players[murderer.id]) io.emit('witchWin', {});
            else io.emit('townWin', {});
        }
        socket.to(msg.playerKilled).emit('killed', {});
        setTimeout(()=>{delete players[msg.playerKilled];}, 100);
        lastKill = msg.playerKilled;
    });

    socket.on('Chosen', (msg)=>{
        if (!players[msg.id]) return;
        players[msg.id].chosen = true;
    });

    socket.on('stun', (msg)=>{
        players[msg.player].stunned = true;
        io.to(msg.player).emit('stunned', {amount: msg.amount});
        io.emit('stunSound', {x: msg.x, y: msg.y});
        setTimeout(()=>{players[msg.player].stunned = false;}, msg.amount);
    });

    socket.on('itemInterfere', (msg)=>{
        if (!items[msg.id]) return;
        items[msg.id].picked = true;
        setTimeout(()=>{delete items[msg.id];}, 100);
    });

    socket.on('itemPickup', (msg)=>{
        if(!items[msg.id]) return;
        items[msg.id].picked = true;
        io.emit('itemPicked', {id:msg.id});
        delete items[msg.id];
    });
    socket.on('disconnect', (msg)=>{
        if (players[socket.id] == undefined && players[socket.id] == null && spectators[socket.id] == undefined){
            console.log("Player has left before joining!");
            return;
        } 
        let playerLeft;
        if(players[socket.id] != undefined) console.log(players[socket.id].nickname + " has left the game!");
        else if(spectators[socket.id] != undefined) console.log(spectators[socket.id].nickname + " has left the game!");
        if (players[socket.id]){ players[socket.id].isDead = true; playerLeft = players[socket.id];}
        if (players[socket.id]) players[socket.id].left = true;
        if (spectators[socket.id]){
            spectators[socket.id].left = true;
            playerLeft = spectators[socket.id];
        }
        io.emit('leaveMsg', {player: playerLeft});
        setTimeout(()=>{
            if (players[socket.id] != undefined)
                delete players[socket.id];
            else if(spectators[socket.id] != undefined) delete spectators[socket.id];
        }, 1000);
        onlinePlayers--;
        if (onlinePlayers < minPlayers){
            clearInterval(timer);
            timer = undefined;
            if (curGame == Game.INTERMISSION){
                countDown = COUNT;
            }else {
                curGame = Game.INTERMISSION;
                countDown = COUNT;
            }
        }
        if (onlinePlayers < 1 && gameTick){
            gameTick = false;
            clearInterval(gameTicker);
            console.log("Game stopped!");
        }
    });
});

function timeCount(){
    if (countDown > 0){
        countDown--;
    }else if(curGame == Game.INTERMISSION){
        murderer = randomPlayer();
        detective = randomPlayer();
        curGame = Game.INGAME;
        while (true){
            if (onlinePlayers < minPlayers){
                break;
            }
            if (detective != murderer) break;
            detective = randomPlayer();
        }
        gameStart();
        alive = onlinePlayers;
        io.emit('startGame', {murderer:murderer, detective:detective});
        countDown = ROUND_LENGTH;
    }else if(curGame == Game.INGAME){
        curGame = Game.INTERMISSION;
        gameEnd();
        countDown = COUNT+6;
        io.emit('endScreen', {});
        setTimeout(()=>{io.emit('gameEnd', {});}, 5000);
    }
}

function gameStart(){
    for (const key in players){
        if (players[key].chosen == false)
            io.to(key).emit('killed', {});
    }
}

function gameEnd(){
    curGame = Game.INTERMISSION;
    lastKill = undefined;
    lastItemPicked = undefined;
    lastMsg = undefined;
    for (const key in items){
        items[key].picked = true;
    }
    items = undefined;
    items = {};
    for (const key in spectators){
        spectators[key].isDead = false;
        players[key] = spectators[key];
        players[key].direction = 'left';
    }
    spectators = undefined;
    spectators = {};
}

function randomPlayer(){
    let dict = {};
    let count = 0;
    for (const key in players){
        dict[count] = players[key];
        count++;
    }
    let randNum = Math.floor(Math.random()*count);
    return dict[randNum];
}

function chooseItem(){
    let rand = Math.round(Math.random()*100)+1;
    let prevChance = 0;
    for (let i = 0; i < itemSelection.length; i++){
        let value = itemSelection[i];
        if (rand <= prevChance+value.chance && rand > prevChance){
            return value.name;
        }
        if (prevChance == 101) prevChance = 0;
        prevChance += value.chance;
    }
    return itemSelection[2].name;
}

function countItems(){
    let count = 0;
    for (const key in items){
        count++;
    }
    return count;
}

function startGameTick(){
    io.emit('gamestate', {
        players: players,
        spectators: spectators,
        items:items,
        curMode : curGame,
        time: countDown,
    });
    io.emit('bullets', {bullet: projectiles});
    for (const key in projectiles){
        if (projectiles[key].amount == undefined){
            projectiles[key].amount = 1;
        }else {
            projectiles[key].amount++;
        }
    }
    if (curGame == Game.INTERMISSION) return;
    let randInt = Math.round((Math.random()*1000)+1);
    let x1 = Math.round((Math.random()*mapObj.width)+1);
    let y1 = Math.round((Math.random()*mapObj.height)+1);
    let item = chooseItem();
    if (randInt < 10 && countItems() < 50){
        let tempItem = {x: x1, y: y1, name: item, id:uuid.v4(), created: Date.now()};
        items[tempItem.id] = tempItem;
    }
    for (const key in items){
        if (Date.now()-items[key].created > ITEM_DESPAWN && !items[key].neverDespawn){
            items[key].picked = true;
            setTimeout(()=>{delete items[key]}, 100);
        }
    }
}

http.listen(PORT, ()=>{
    console.log("Listening on " + HOST + ":" + PORT);
});
