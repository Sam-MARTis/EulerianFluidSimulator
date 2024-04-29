//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;

SIM_WIDTH = 250;
SIM_HEIGHT = 100;
GRAVITY = 9.8;
TIME_STEP = 0.1;
CELL_SIZE = window.innerWidth*window.innerHeight*(devicePixelRatio**2)/(SIM_WIDTH*SIM_HEIGHT);
PRESSURE_CONSTANT = 1
BOUNDRY_VEL = 10;

let cell_array = [];

const convertTo1D = (x, y) => {
  return y * SIM_WIDTH + x;
};
const convertTo2D = (index) => {
    return [index % SIM_WIDTH, Math.floor(index / SIM_WIDTH)];
};

//Structures and Classes
class Cell {
  constructor(x, y, size, isWall=0) {
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
    this.pressure = 0;
  }
  calculatePressure = () => {
    this.pressure = (PRESSURE_CONSTANT * this.divergence) / (4 * this.size);
  };

  updateSurroundingBlocks = () => {
    let left = convertTo1D(this.x - 1, this.y);
    let right = convertTo1D(this.x + 1, this.y);
    let up = convertTo1D(this.x, this.y - 1);
    let down = convertTo1D(this.x, this.y + 1);

    this.surroundingBlocks = [
      cell_array[left],
      cell_array[up],
      cell_array[right],
      cell_array[down],
    ];
    this.fluidBlocks = this.surroundingBlocks.map((block) => !block.isWall);
    this.fluidBlockCount = this.fluidBlocks.reduce((prev, curr) => {
      return prev + curr;
    }); //Summing up fluidBlocks array
  };

  sync = () => {
    if( !this.surroundingBlocks[0].isWall){
    this.surroundingBlocks[0].rightV = this.leftV;
    }
    if( !this.surroundingBlocks[1].isWall){
    this.surroundingBlocks[1].downV = this.upV;
    }
    if( !this.surroundingBlocks[2].isWall){
    this.surroundingBlocks[2].leftV = this.rightV;
    }
    if( !this.surroundingBlocks[3].isWall){
    this.surroundingBlocks[3].upV = this.downV;
    }
  };

  gravity = () => {
    let accerlation = GRAVITY * TIME_STEP;
    this.downV += accerlation * this.fluidBlocks[3];
    this.upV += accerlation * this.fluidBlocks[1];
  };

  handleDivergence = () => {
    this.divergence = this.rightV - this.leftV + this.downV - this.upV;
    let valueToMove =
      (this.overRelaxation * this.divergence) / this.fluidBlockCount;

    this.leftV = this.leftV - valueToMove * this.fluidBlocks[0];
    this.rightV = this.rightV + valueToMove * this.fluidBlocks[2];
    this.upV = this.upV - valueToMove * this.fluidBlocks[1];
    this.downV = this.downV + valueToMove * this.fluidBlocks[3];
  };

  update = () => {
    this.gravity();
    this.handleDivergence();
    this.calculatePressure();

    this.sync(); //Will do this after a complete iteration //Nevermind

  };
}



//Function definitions


const create_cells = () => {
    
    for (let i = 0; i < SIM_WIDTH * SIM_HEIGHT; i++) {
      let [x, y] = convertTo2D(i);
    //   let isWall = Math.random() > 0.5;
      cell_array.push(new Cell(x, y, CELL_SIZE, 0));
    }
    for (let k = 0; k < SIM_WIDTH; k++) {
        cell_array[convertTo1D(k, 0)].isWall = true;
        cell_array[convertTo1D(k, SIM_HEIGHT - 1)].isWall = true;
    }
    for (let j = 0; j < SIM_HEIGHT; j++) {
        cell_array[convertTo1D(0, j)].isWall = true;
        cell_array[convertTo1D(0, j)].rightV = BOUNDRY_VEL;
        cell_array[convertTo1D(0, j)].leftV = BOUNDRY_VEL;
        cell_array[convertTo1D(SIM_WIDTH - 1, j)].isWall = true;
        cell_array[convertTo1D(SIM_WIDTH - 1, j)].rightV = BOUNDRY_VEL;
        cell_array[convertTo1D(SIM_WIDTH - 1, j)].leftV = BOUNDRY_VEL;
    }
}

const traverse_cells = () => {
    for(let j = 1; j < SIM_HEIGHT - 1; j++){
        for(let i = 1; i < SIM_WIDTH - 1; i++){
            cell_array[convertTo1D(i, j)].updateSurroundingBlocks();
        }
    }

}

const init = () => {
    canvas = document.getElementById("fluid-simulator");
    ctx = canvas.getContext("2d");
  
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
  
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
  
    // ctx.scale(devicePixelRatio, devicePixelRatio);
  };





//Event Listeners

document.addEventListener("DOMContentLoaded", init);
