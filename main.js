//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;

SIM_WIDTH = 150;
SIM_HEIGHT = 100;
GRAVITY = 9.8;
TIME_STEP = 0.00001;
// CELL_SIZE = window.innerWidth*window.innerHeight*(devicePixelRatio**2)/(SIM_WIDTH*SIM_HEIGHT);
CELL_SIZE = 5;
PRESSURE_CONSTANT = 500;
BOUNDRY_VEL = 1;
OVER_RELAXATION_CONSTANT = 2;

let cell_array = [];

const convertTo1D = (x, y) => {
  let val = Math.floor(y) * SIM_WIDTH + Math.floor(x);
  if (val>=SIM_HEIGHT*SIM_WIDTH){
    return SIM_HEIGHT*SIM_WIDTH-1;
  
  }
  if (val<0){
    return 0;
  }
  return val;
};
const convertTo2D = (index) => {
  return [index % SIM_WIDTH, Math.floor(index / SIM_WIDTH)];
};

//Structures and Classes
class Source {
  constructor(x, y, size, p = 240) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.isWall = true;
    this.rightV = 0;
    this.flowV = 0;
    this.pressure = p;
  }
  update = () => {
    let index = convertTo1D(this.x + 1, this.y);
    cell_array[index].rightV = this.flowV;
  };
}
class Cell {
  constructor(x, y, size, p = 20, isWall = 0) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.upV = 0;
    this.downV = 0;
    this.leftV = 0;
    this.rightV = 0;
    this.divergence = 0;
    this.overRelaxation = OVER_RELAXATION_CONSTANT;
    this.surroundingBlocks = [];
    this.isWall = isWall;
    this.fluidBlockCount = 4;
    this.fluidBlocks = [1, 1, 1, 1]; //Left up right down
    this.pressure = 0;
  }
  calculatePressure = () => {
    this.pressure +=
      (PRESSURE_CONSTANT * this.divergence) / (CELL_SIZE * TIME_STEP);
    if (this.pressure < 0) {
      this.pressure = 0;
    }
    if (this.pressure > 255) {
      this.pressure = 255;
    }
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
    if (!this.surroundingBlocks[0].isWall) {
      this.surroundingBlocks[0].rightV = this.leftV;
    }
    if (!this.surroundingBlocks[1].isWall) {
      this.surroundingBlocks[1].downV = this.upV;
    }
    if (!this.surroundingBlocks[2].isWall) {
      this.surroundingBlocks[2].leftV = this.rightV;
    }
    if (!this.surroundingBlocks[3].isWall) {
      this.surroundingBlocks[3].upV = this.downV;
    }
  };

  gravity = () => {
    let accerlation = GRAVITY * TIME_STEP;
    this.downV += accerlation;
    this.upV += accerlation;
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
  advectVelocity = () => {
    let dx, dy, x, y;

    //RightV
    let rightBlock = this.surroundingBlocks[2];
    if (!rightBlock.isWall) {
      let rightV_x = this.rightV;
      let rightV_y =
        (this.upV + this.downV + rightBlock.upV + rightBlock.downV) / 4;
      dx = (rightV_x * TIME_STEP) / CELL_SIZE;
      dy = (rightV_y * TIME_STEP) / CELL_SIZE;
      x = this.x + 1 + dx;
      y = this.y + 1 / 2 + dy;
      this.rightV = findVelocityAtPoint(x, y)[0];

    }
    //LeftV
    let leftBlock = this.surroundingBlocks[0];
    if (!leftBlock.isWall) {
      let leftV_x = this.leftV;
      let leftV_y =
        (this.upV + this.downV + leftBlock.upV + leftBlock.downV) / 4;
      dx = (leftV_x * TIME_STEP) / CELL_SIZE;
      dy = (leftV_y * TIME_STEP) / CELL_SIZE;
      x = this.x + dx;
      y = this.y + 1 / 2 - dy;
      this.leftV = findVelocityAtPoint(x, y)[0];
    }
    //UpV
    let upBlock = this.surroundingBlocks[1];
    if (!upBlock.isWall) {
      let upV_x =
        (this.rightV + this.leftV + upBlock.rightV + upBlock.leftV) / 4;
      let upV_y = this.upV;
      dx = (upV_x * TIME_STEP) / CELL_SIZE;
      dy = (upV_y * TIME_STEP) / CELL_SIZE;
      x = this.x + 1 / 2 + dx;
      y = this.y + dy;
      this.upV = findVelocityAtPoint(x, y)[1];
    }
    //DownV
    let downBlock = this.surroundingBlocks[3];
    if (!downBlock.isWall) {
      let downV_x =
        (this.rightV + this.leftV + downBlock.rightV + downBlock.leftV) / 4;
      let downV_y = this.downV;
      dx = (downV_x * TIME_STEP) / CELL_SIZE;
      dy = (downV_y * TIME_STEP) / CELL_SIZE;
      x = this.x + 1 / 2 + dx;
      y = this.y + 1 + dy;
      this.downV = findVelocityAtPoint(x, y)[1];
    }
  };

  update = () => {
    this.updateSurroundingBlocks();
    this.gravity();
    this.handleDivergence();
    this.calculatePressure();
    this.advectVelocity();

     //Will do this after a complete iteration //Nevermind

  };
}

//Function definitions

const findVelocityAtPoint = (X, Y) => {
  let cellThis = cell_array[convertTo1D(X, Y)];
  let dx = X - Math.floor(X);
  let dy = Y - Math.floor(Y);
  let x = cellThis.leftV * dx + cellThis.rightV * (1 - dx);
  let y = cellThis.upV * dy + cellThis.downV * (1 - dy);
  return [x, y];
};

const create_cells = () => {
  for (let j = 0; j < SIM_HEIGHT; j++) {
    cell_array.push(new Source(0, j, size = CELL_SIZE, p = 0));
  

  for (let i = 1; i < SIM_WIDTH; i++) {
    let [x, y] = convertTo2D(i);
    //   let isWall = Math.random() > 0.5;
    cell_array.push(new Cell(x, y, CELL_SIZE, p = 0, isWall = false));
  }
}
  // for (let k = 0; k < SIM_WIDTH; k++) {
  //     cell_array[convertTo1D(k, 0)].isWall = true;
  //     cell_array[convertTo1D(k, SIM_HEIGHT - 1)].isWall = true;
  // }
  // for (let j = 0; j < SIM_HEIGHT; j++) {
  //     cell_array[convertTo1D(0, j)].isWall = true;
  //     cell_array[convertTo1D(0, j)].rightV = BOUNDRY_VEL;
  //     cell_array[convertTo1D(0, j)].leftV = BOUNDRY_VEL;
  //     cell_array[convertTo1D(SIM_WIDTH - 1, j)].isWall = true;
  //     cell_array[convertTo1D(SIM_WIDTH - 1, j)].rightV = BOUNDRY_VEL;
  //     cell_array[convertTo1D(SIM_WIDTH - 1, j)].leftV = BOUNDRY_VEL;

  //     cell_array[convertTo1D(SIM_WIDTH - 2, j)].rightV = BOUNDRY_VEL;
  //     cell_array[convertTo1D(SIM_WIDTH - 2, j)].leftV = BOUNDRY_VEL;
  // }
};

const traverse_cells = () => {
  for (let i = 0; i < SIM_WIDTH - 2; i++) {
    for (let j = 2; j < SIM_HEIGHT - 2; j++) {
      cell_array[convertTo1D(i, j)].update();
    }
  }
  for (let i = 1; i < SIM_WIDTH - 2; i++) {
    for (let j = 2; j < SIM_HEIGHT - 2; j++) {
      cell_array[convertTo1D(i, j)].sync();
    }
  }
  
};
const display_cells = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "blue";
  for (let i = 0; i < SIM_WIDTH * SIM_HEIGHT; i++) {
    let [x, y] = convertTo2D(i);
    if (cell_array[i].isWall) {
      ctx.fillStyle = "green";
    } else {
      ctx.fillStyle = `rgb(${255 - cell_array[i].pressure},0,${cell_array[i].pressure}`;
      // console.log(cell_array[i].pressure)
      if ((i + 10) % 100 == 0) {
        console.log(cell_array[i].pressure);
      }
    }
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
};

const init = () => {
  canvas = document.getElementById("fluid-simulator");
  ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;

  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";

  // ctx.scale(devicePixelRatio, devicePixelRatio);
  create_cells();
  display_cells();
  main_loop();
};

const main_loop = () => {
  traverse_cells();
  display_cells();
  console.log("Looping");
  requestAnimationFrame(main_loop);
};

//Event Listeners

document.addEventListener("DOMContentLoaded", init);
