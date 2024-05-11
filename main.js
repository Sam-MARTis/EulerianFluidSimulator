//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;

SIM_WIDTH = 150;
SIM_HEIGHT = 100;
GRAVITY = 0;
TIME_STEP = 0.01;
// CELL_SIZE = window.innerWidth*window.innerHeight*(devicePixelRatio**2)/(SIM_WIDTH*SIM_HEIGHT);
CELL_SIZE = 3;
PRESSURE_CONSTANT = 1;
BOUNDRY_VEL = 1000;
OVER_RELAXATION_CONSTANT = 1.7;
VEL_CONST = 0.5;
DIVERGENCE_ITERATIONS_COUNT = 30;

let cell_array = [];

const convertTo1D = (x, y) => {
  let val = Math.floor(y) * SIM_WIDTH + Math.floor(x);
  if (val >= SIM_HEIGHT * SIM_WIDTH) {
    return SIM_HEIGHT * SIM_WIDTH - 1;
  }
  if (val < 0) {
    return 0;
  }
  return val;
};
const convertTo2D = (index) => {
  if (index >= SIM_HEIGHT * SIM_WIDTH) {
    index = SIM_HEIGHT * SIM_WIDTH - 1;
  }
  return [index % SIM_WIDTH, Math.floor(index / SIM_WIDTH)];
};

class Cell {
  constructor(x, y, size, isWall = 0) {
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
    this.velMag = 0;
    this.wallL = 0;
    this.wallU = 0;
    this.wallR = 0;
    this.wallD = 0;
  }
  setWallStates = (l, u, r, d) => {
    this.wallL = l;
    this.wallU = u;
    this.wallR = r;
    this.wallD = d;
  };

  useWallStates = () => {
    this.leftV = this.wallL;
    this.upV = this.wallU;
    this.rightV = this.wallR;
    this.downV = this.wallD;
  };

  calculatePressure = () => {
    this.pressure =
      -(PRESSURE_CONSTANT * this.divergence) / (CELL_SIZE * TIME_STEP);
    if (this.pressure < -127) {
      this.pressure = -127;
    }
    if (this.pressure > 127) {
      this.pressure = 127;
    }
  };
  calculateVelMag = () => {
    this.velMag = Math.sqrt(
      (this.upV + this.downV) ** 2 + (this.leftV + this.rightV) ** 2
    );
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
    if (this.isWall) {
      this.useWallStates();
    }
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
    if (this.isWall) {
      this.useWallStates();
    }
  };
  handleWall = () => {
    if (this.surroundingBlocks[0].isWall) {
      this.surroundingBlocks[0].rightV = this.leftV;
    }
    if (this.surroundingBlocks[1].isWall) {
      this.surroundingBlocks[1].downV = this.upV;
    }
    if (this.surroundingBlocks[2].isWall) {
      this.surroundingBlocks[2].leftV = this.rightV;
    }
    if (this.surroundingBlocks[3].isWall) {
      this.surroundingBlocks[3].upV = this.downV;
    }
  };

  calculateDivergence = () => {
    this.divergence = this.rightV - this.leftV + this.downV - this.upV;
  };
  makeDivergenceZero = () => {
    if (this.isWall) {
      this.useWallStates();
      return;
    }
    let valueToMove =
      (this.overRelaxation * this.divergence) / this.fluidBlockCount;

    this.leftV = this.leftV + valueToMove * this.fluidBlocks[0];
    this.rightV = this.rightV - valueToMove * this.fluidBlocks[2];
    this.upV = this.upV + valueToMove * this.fluidBlocks[1];
    this.downV = this.downV - valueToMove * this.fluidBlocks[3];
  };
  advectVelocity = () => {
    if (this.isWall) {
      this.useWallStates();
      return;
    }
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
      if (x < 1) x = 1;
      if (x > SIM_WIDTH - 3) x = SIM_WIDTH - 2;
      if (y < 0) y = 0;
      if (y > SIM_HEIGHT) y = 0;
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
      if (x < 1) x = 1;
      if (x > SIM_WIDTH - 3) x = SIM_WIDTH - 2;
      if (y < 0) y = 0;
      if (y > SIM_HEIGHT) y = 0;
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
      if (x < 1) x = 1;
      if (x > SIM_WIDTH - 3) x = SIM_WIDTH - 2;
      if (y < 0) y = 0;
      if (y > SIM_HEIGHT) y = 0;
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
      if (x < 1) x = 1;
      if (x > SIM_WIDTH - 3) x = SIM_WIDTH - 2;
      if (y < 0) y = 0;
      if (y > SIM_HEIGHT) y = 0;
      this.downV = findVelocityAtPoint(x, y)[1];
    }
  };

  update = () => {
    this.gravity();
    this.calculateDivergence();
    this.calculatePressure();

    //Will do this after a complete iteration //Nevermind
  };
  copyValsTo = (other) => {
    other.rightV = this.rightV;
    other.leftV = this.leftV;
    other.upV = this.upV;
    other.downV = this.downV;
    other.divergence = this.divergence;
    other.pressure = this.pressure;
    other.velMag = this.velMag;
  };
}

//Function definitions

const findVelocityAtPoint = (X, Y) => {
  if (X < 2) {
    X = 2;
  }
  if (Y < 2) {
    Y = 2;
  }
  if (X > SIM_WIDTH - 2) {
    X = SIM_WIDTH - 2;
  }
  if (Y > SIM_HEIGHT - 2) {
    Y = SIM_HEIGHT - 2;
  }
  let idx = Math.floor(convertTo1D(X, Y));
  if (idx >= SIM_HEIGHT * SIM_WIDTH) {
    idx = SIM_HEIGHT * SIM_WIDTH - 1;
    console.warn(`idx is ${idx} and X is ${X} and Y is ${Y}`);
  }
  if (idx < 0) {
    console.warn(`idx is ${idx} and X is ${X} and Y is ${Y}`);
    idx = 0;
  }
  let cellThis = cell_array[idx];
  let dx = X - Math.floor(X);
  let dy = Y - Math.floor(Y);
  let x_vel = cellThis.leftV * (1 - dx) + cellThis.rightV * dx;
  let y_vel = cellThis.upV * (1 - dy) + cellThis.downV * dy;
  return [x_vel, y_vel];
};

const create_cells = () => {
  for (let j = 0; j < SIM_HEIGHT; j++) {
    for (let i = 0; i < SIM_WIDTH; i++) {
      //   let isWall = Math.random() > 0.5;
      cell_array.push(new Cell(i, j, CELL_SIZE, (p = 0), (isWall = false))); //ROW MAJOR
    }
  }
};
const setup_border_cell_states = () => {
  for (let y_coord = 0; y_coord < SIM_HEIGHT; y_coord++) {
    // let index_to_refer = convertTo1D(0, y_coord);
    let cellOuter = cell_array[convertTo1D(0, y_coord)];
    cellOuter.isWall = true;
    cellOuter.setWallStates(BOUNDRY_VEL, 0, BOUNDRY_VEL, 0);
    let cellInner = cell_array[convertTo1D(1, y_coord)];
    cellInner.isWall = true;
    cellInner.setWallStates(BOUNDRY_VEL, 0, BOUNDRY_VEL, 0);
    // let lcellOuter = cell_array[convertTo1D(SIM_WIDTH-1, y_coord)]
    // let lcellInner = cell_array[convertTo1D(SIM_WIDTH-2, y_coord)]
    // lcellInner.isWall = true;
    // lcellOuter.isWall = true;
    // lcellOuter.setWallStates(BOUNDRY_VEL, 0, BOUNDRY_VEL, 0);
    // lcellInner.setWallStates(BOUNDRY_VEL, 0, BOUNDRY_VEL, 0);
  }
  for (let x_coord = 0; x_coord < SIM_WIDTH; x_coord++) {
    cell_array[convertTo1D(x_coord, 0)].isWall = true;
    cell_array[convertTo1D(x_coord, 1)].isWall = true;
    cell_array[convertTo1D(x_coord, SIM_HEIGHT - 1)].isWall = true;
    cell_array[convertTo1D(x_coord, SIM_HEIGHT - 2)].isWall = true;
  }
  for (let x_coord = 1; x_coord < SIM_WIDTH; x_coord++) {
    for (let y_coord = 1; y_coord < SIM_HEIGHT - 1; y_coord++) {
      let index_to_refer = convertTo1D(x_coord, y_coord);
      let cellThis = cell_array[index_to_refer];
      cellThis.updateSurroundingBlocks();
    }
  }
};

const traverse_cells = () => {
  for (let y_coord = 2; y_coord < SIM_HEIGHT - 2; y_coord++) {
    let cellCurrent = cell_array[convertTo1D(SIM_WIDTH - 3, y_coord)];
    cellCurrent.copyValsTo(cell_array[convertTo1D(SIM_WIDTH - 2, y_coord)]);
    cellCurrent.copyValsTo(cell_array[convertTo1D(SIM_WIDTH - 1, y_coord)]);
  }

  for (let j = 1; j < SIM_HEIGHT - 1; j++) {
    for (let i = 1; i < SIM_WIDTH - 1; i++) {
      let current_cell = cell_array[convertTo1D((x = i), (y = j))];

      current_cell.gravity();
      current_cell.pressure = 0;
      // current_cell.calculateDivergence();
      // current_cell.calculatePressure();
      // current_cell.calculateVelMag();
      // current_cell.calculateDivergence();
    }
  }

  for (let iteration = 0; iteration < DIVERGENCE_ITERATIONS_COUNT; iteration++) {
    for (let j = 1; j < SIM_HEIGHT - 1; j++) {
      for (let i = 1; i < SIM_WIDTH - 1; i++) {
        let current_cell = cell_array[convertTo1D((x = i), (y = j))];

        current_cell.calculateDivergence();
        current_cell.calculatePressure();
        // current_cell.calculateVelMag();
        current_cell.makeDivergenceZero();
        current_cell.sync();
      }
    }
    // for (let j = 1; j < SIM_HEIGHT - 1; j++) {
    //   for (let i = 1; i < SIM_WIDTH - 1; i++) {
    //     let current_cell = cell_array[convertTo1D((x = i), (y = j))];
    //   }
    // }
  }

  for (let i = 1; i < SIM_WIDTH - 1; i++) {
    for (let j = 1; j < SIM_HEIGHT - 1; j++) {
      let current_cell = cell_array[convertTo1D((x = i), (y = j))];

      current_cell.advectVelocity();
      current_cell.sync();
    }
  }
};

const create_obstacle = () => {
  for (
    let x_offset = Math.round(SIM_WIDTH * 0.4);
    x_offset <= SIM_WIDTH * 0.6;
    x_offset++
  ) {
    for (
      let y_offset = Math.round(SIM_HEIGHT * 0.4);
      y_offset <= SIM_HEIGHT * 0.6;
      y_offset++
    ) {
      let cell_current = cell_array[convertTo1D(x_offset, y_offset)];
      cell_current.isWall = true;
      cell_current.leftV = 0;
      cell_current.rightV = 0;
      cell_current.upV = 0;
      cell_current.downV = 0;
    }
  }
};

const display_cells = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "blue";
  for (let i = 0; i < SIM_WIDTH * SIM_HEIGHT; i++) {
    let [x, y] = convertTo2D(i);
    current_cell = cell_array[i];
    // prop_to_display = current_cell.velMag * VEL_CONST;
    prop_to_display = current_cell.pressure;
    if (current_cell.isWall) {
      ctx.fillStyle = "green";
    } else {
      ctx.fillStyle = `rgb(${125 + prop_to_display},0,${125-prop_to_display}`;
      // console.log(current_cell.pressure)
      if ((i + 10) % 100 == 0) {
        // console.log(current_cell.rightV);
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
  // initialize_cells();
  setup_border_cell_states();
  create_obstacle();
  display_cells();
  setInterval(main_loop, 50);
};

const main_loop = () => {
  traverse_cells();
  display_cells();
  // console.log("Looping");
};

const debugValues = (e) => {
  // console.log(e);
  let cell =
    cell_array[convertTo1D(e.layerX / CELL_SIZE, e.layerY / CELL_SIZE)];
  cell.calculateDivergence();
  console.log(
    `Coordinates: ${e.layerX / CELL_SIZE}, ${
      e.layerY / CELL_SIZE
    }\nPressure of cell is: ${cell.pressure} \nVelocities of cells are [${
      cell.leftV
    }, ${cell.upV}, ${cell.rightV}, ${cell.downV}]\nDivergence is ${
      cell.divergence
    }`
  );
};

//Event Listeners

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("mousemove", debugValues);
document.addEventListener("click", debugValues);
