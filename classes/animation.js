
function Animation(filename, frames, delay, width, height){
    this.filename = filename;
    let width1 = width;
    let height1 = height;
    this.frames = frames;
    const frameCount = this.frames;
    this.delay = delay;
	let intervalDelay = this.delay;
    this.width = width;
    this.height = height;
    let curframe;
    this.curFrame = 0;
    this.isOn = false;
    this.defaultTexture;
    let storedWebImage;
	let bufferImage;
    this.referenceTexture; 
    this.webImg;
    this.interval;
    this.frameList = [];
    const frameListArray = this.frameList;
    this.load = function(){
        for (let i = 0; i < frames; i++){
            this.frameList.push("textures/" + filename + "/" + "char2_" + i.toString() + ".png");
			//this.frameList[i].setSize(width, height);
        }
        this.defaultTexture = "textures/" + filename + "/" + "char2_" + "default" + ".png";
    };
    this.stop = function(webImage){
        if (!this.interval) return;
        if(!this.isOn) return;
        this.isOn = false;
        clearInterval(this.interval);
        this.curFrame = 0;
        curframe = 0;
        this.interval = undefined;
        storedWebImage.setImage(this.defaultTexture);
        storedWebImage.setSize(width1, height1);
		//storedWebImage.setPosition();
    };
    this.start = function(webImage){
        if (this.interval != undefined) return;
        this.isOn = true;
        storedWebImage = webImage;
        curframe = 0;
        this.webImg = webImage;
        this.animation = function(){
            if (curframe == frameCount){
                curframe = 0;
            }
			//bufferImage = new WebImage('textures/'+filename+'/char2_'+curframe+'.png');
			//bufferImage.setPosition(storedWebImage.getX(), storedWebImage.getY());
			//bufferImage.setSize(width, height);
			storedWebImage.setImage(frameListArray[curframe]);
			storedWebImage.setSize(width, height);
			//ctx.restore();
			//remove(storedWebImage);
			//storedWebImage = frameListArray[curframe];
			//storedWebImage.setPosition(x, y);
			//add(storedWebImage);
			//add(bufferImage);
			//let temp = bufferImage;
			//bufferImage = storedWebImage;
            //storedWebImage = temp;
			//remove(bufferImage);
            curframe++;
        };
        this.interval = setInterval(this.animation, this.delay);
    };
}
function Point(x, y){
    this.x = x;
    this.y = y;
    this.getX = function(){
        return this.x;
    };
    this.getY = function(){return this.y;};
    this.getHeight = function(){
        return 2;
    };
}