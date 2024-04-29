
//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;




//Function definitions
const init = () => {
    canvas = document.getElementById('fluid-simulator');
    ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth* devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;

    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    // ctx.scale(devicePixelRatio, devicePixelRatio);
}





//Structures and Classes
class Cell {
    constructor(x, y, size, isWall) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.upV = 0;
        this.downV = 0;
        this.leftV = 0;
        this.rightV = 0;
        this.divergence = 0;
        this.overRelaxation = 1;
        this.surroundingBlocks = [];
        this.isWall = isWall;
        this.fluidBlockCount = 4
        this.fluidBlocks = [1, 1, 1, 1]; //Left up right down

        
    }

    getFluidBlocksCount = () => {
        return this.surroundingBlocks.filter(block => block.isWall==1).length;
    }

    update() {
        this.divergence = this.rightV - this.leftV + this.downV - this.upV;
        let valueToMove = (this.overRelaxation * this.divergence / this.fluidBlockCount)

        this.leftV = this.leftV - valueToMove*this.fluidBlocks[0];
        this.rightV = this.rightV + valueToMove*this.fluidBlocks[2];
        this.upV = this.upV - valueToMove*this.fluidBlocks[1];
        this.downV = this.downV + valueToMove*this.fluidBlocks[3];
    }

}





//Event Listeners

document.addEventListener('DOMContentLoaded', init);