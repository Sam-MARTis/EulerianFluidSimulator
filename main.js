//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;

SIM_WIDTH = 200;
SIM_HEIGHT = 100;
GRAVITY = 9.8;
TIME_STEP = 0.1;

let cell_array = [];


//Function definitions
const init = () => {
  canvas = document.getElementById("fluid-simulator");
  ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;

  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";

  // ctx.scale(devicePixelRatio, devicePixelRatio);
};

const convertTo2D = (index) => {
  let x = index % SIM_WIDTH;
  let y = Math.floor(index / SIM_WIDTH);
  return [x, y];
};
const convertTo1D = (x, y) => {
  return y * SIM_WIDTH + x;
};

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
    this.fluidBlockCount = 4;
    this.fluidBlocks = [1, 1, 1, 1]; //Left up right down
  }


  getFluidBlocksCount = () => {
    return this.surroundingBlocks.filter((block) => block.isWall == 0).length;
  };

  updateSurroundingBlocks = () => {
    let left = convertTo1D(this.x - 1, this.y);
    let right = convertTo1D(this.x + 1, this.y);
    let up = convertTo1D(this.x, this.y - 1);
    let down = convertTo1D(this.x, this.y + 1);

    this.surroundingBlocks = [cell_array(left), cell_array(up), cell_array(right), cell_array(down)];
    this.fluidBlockCount = this.getFluidBlocksCount();
  }
  
  sync = () => {
    this.surroundingBlocks[0].rightV = this.leftV;
    this.surroundingBlocks[1].downV = this.upV;
    this.surroundingBlocks[2].leftV = this.rightV;
    this.surroundingBlocks[3].upV = this.downV;
  }


  gravity = () => {
    let accerlation = GRAVITY * TIME_STEP;
    this.downV += accerlation;
    this.upV -= accerlation;

  }


  update = () => {
    this.gravity();
    this.divergence = this.rightV - this.leftV + this.downV - this.upV;
    let valueToMove =
      (this.overRelaxation * this.divergence) / this.fluidBlockCount;

    this.leftV = this.leftV - valueToMove * this.fluidBlocks[0];
    this.rightV = this.rightV + valueToMove * this.fluidBlocks[2];
    this.upV = this.upV - valueToMove * this.fluidBlocks[1];
    this.downV = this.downV + valueToMove * this.fluidBlocks[3];
  };
}

//Event Listeners

document.addEventListener("DOMContentLoaded", init);
