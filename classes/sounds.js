let shoot;
let kill;
let bell;
let stun;
let blip;

let ambient1;
let ambient2;
let ambient3;

function Sound(sound, distance, loop){
    this.loop = loop;
    this.sound = sound;
    this.distance = distance;
    this.playDist = function(){
        if (1/distance < 0.1) return;
        this.sound.volume = 1/distance;
        this.sound.play();
    };
}   