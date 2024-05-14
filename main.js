//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;
cell_array = []; //ROW MAJOR
velocityArrayHorizontal = []; //ROW MAJOR
velocityArrayVertical = []; // ROW MAJOR
OVER_RELAXATION_CONSTANT = 1;
WIDTH = 100;
HEIGHT = 100;
CELL_SIZE = 3;

const isAFluidCell = (x, y) => {
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return false;
  }
  if (cell_array[x][y].isFluid) {
    return true;
  }
  return false;
};
class VelocityVector {
  constructor(orientation = 0, u = 0, v = 0, isImmutable = 0) {
    this.u = u; //horizonatlly forward
    this.v = v; //vertically down
    this.orientation = orientation;
    //Zero is horizonal, 1 is vertical


  }
  updateValues = (u, v) => {
    if (this.isImmutable) {
      return;
    }
    this.u = u;
    this.v = v;
    return this;
  };
  add = (otherVector) => {
    this.u += otherVector.u;
    this.v += otherVector.v;
    return this;
  };
  subtract = (otherVector) => {
    this.u -= otherVector.u;
    this.v -= otherVector.v;
    return this;
  };
  divideBy = (scalar) => {
    this.u /= scalar;
    this.v /= scalar;
    return this;
  };
  multiplyBy = (scalar) => {
    this.u *= scalar;
    this.v *= scalar;
    return this;
  };
  getValue = () => {
    return this.u * (this.orientation == 0) + this.v * (this.orientation == 1);
  };
  adjustValue = (value) => {
    if (this.isImmutable) {
      return;
    }
    this.u += (this.orientation == 0) * value;
    this.v += (this.orientation == 1) * value;
  };
  gravity = (value) => {
    if (this.isImmutable) {
      return;
    }
    this.v += value;
  }
}
class Cell {
  constructor(x, y, isFLuid = 1) {
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    // this.surroundingFluidBlocks = [];
    this.divergence = 0;
    this.pressure = 0;
    this.velocities = [_, _, _, _]; //left up right down
    this.surroundingFluidBlocksCount = 0;
    this.isFLuid = isFLuid;

    //Remember to call updateVelocities and updateSurroundingFluidBlocksCount before using the cell
    //Also makeWall
  }
  updateVelocities = () => {
    this.velocities[0] = velocityArrayHorizontal[this.x][this.y];
    this.velocities[1] = velocityArrayVertical[this.x][this.y];
    this.velocities[2] = velocityArrayHorizontal[this.x + 1][this.y];
    this.velocities[3] = velocityArrayVertical[this.x][this.y + 1];
  }
  updateSurroundingFluidBlocksCount = () => {
    this.surroundingFluidBlocksCount = 0;
    if (isAFluidCell(this.x - 1, this.y)) {
      this.surroundingFluidBlocksCount++;
    }
    if (isAFluidCell(this.x, this.y - 1)) {
      this.surroundingFluidBlocksCount++;
    }
    if (isAFluidCell(this.x + 1, this.y)) {
      this.surroundingFluidBlocksCount++;
    }
    if (isAFluidCell(this.x, this.y + 1)) {
      this.surroundingFluidBlocksCount++;
    }
  };
  calculateDivergence = () => {
    divergence = 0;
    for (let i = 0; i < this.velocities.length; i++) {
      divergence += (1 - (i < 2) * 2) * this.velocities[i].getValue();
    }
  };
  makeDivergenceZero = () => {
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].adjustValue(
        OVER_RELAXATION_CONSTANT*this.divergence / this.surroundingFluidBlocksCount
      );
    }
  };
  makeWall = () => {
    this.isFluid = 0;
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].isImmutable = 1;
    }
  };

  adVectVelocity = () => {
    //TODO
  }

}

const createCells = (width, height) => {
  for(let y = 0; y<height; y++){
    let row = [];
    for (let x = 0; x < width; x++) {
      row.push(new Cell(x, y));
    }
    cell_array.push(row);
  }
};

const initializeCells = () => {
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      cell_array[i][j].updateVelocities();
      cell_array[i][j].updateSurroundingFluidBlocksCount();
    }
  }

}

const initializeVelocityVectors = (width, height) => {
  for(let y = 0; y< height; y++){
    let row = [];
    for (let x = 0; x < width+1; x++) {
      row.push(new VelocityVector());
    }
    velocityArrayHorizontal.push(row);
  }
  for(let y = 0; y< height+1; y++){
    let row = [];
    for (let x = 0; x < width; x++) {
      row.push(new VelocityVector());
    }
    velocityArrayVertical.push(row);
  }
}
 //Run boundry copier BEFORE cell velocity assignment
const addCopiedBoundry = () => {
  for(let i = 0; i<velocityArrayHorizontal.length; i++){
    velocityArrayHorizontal[velocityArrayHorizontal[0].length-1][i] = velocityArrayHorizontal[velocityArrayHorizontal[0].length-2][i];
  }
  for(let i = 0; i<velocityArrayVertical.length; i++){
    velocityArrayVertical[velocityArrayVertical[0].length-1][i] = velocityArrayVertical[velocityArrayVertical.length-2][i];
  }
}

const gravityStep = (value) => {
  for (let i = 0; i < velocityArrayVertical.length; i++) {
    for (let j = 0; j < velocityArrayVertical[0].length; j++) {
      velocityArrayVertical[i][j].gravity(value);
    }
  }
}

const makeWalls = () => {
  //Walls at right and left of the simulation
  for (let i = 0; i < cell_array[0].length; i++) {
    cell_array[0][i].makeWall();
    cell_array[cell_array[0].length - 1][i].makeWall();
  }
  //Wall at bottom
  for (let i = 0; i < cell_array.length; i++) {
    cell_array[i][cell_array.length - 1].makeWall();
  }

}

const handleDivergence = () => {
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      cell_array[i][j].calculateDivergence();
    }
  }
  //We'll try doing them sepparately. If that doesn't wwork together
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      cell_array[i][j].makeDivergenceZero();
    }
  }

}


const mainLoop = () => {
  traverse_cells();
  display_cells();
};


const displayCells = (cell_size = 3) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      if (cell_array[i][j].isFluid) {
        ctx.fillStyle = "blue";
      } else {
        ctx.fillStyle = "black";
      }
      ctx.fillRect(i * cell_size, j * cell_size, cell_size, cell_size);
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

  createCells(WIDTH, HEIGHT);
  initializeVelocityVectors(WIDTH, HEIGHT);
  addCopiedBoundry();
  initializeCells();
  displayCells(CELL_SIZE);

  // setInterval(main_loop, 1);
};
//Event Listeners

document.addEventListener("DOMContentLoaded", init);
// document.addEventListener("mousemove", debugValues);
// document.addEventListener("click", debugValues);

let divergenceButton = document.getElementById("divergenceStep");
// divergenceButton.addEventListener("click", () => {
//   handleDivergence();
//   display_cells();
// });
// setInterval(handleDivergence, 50);
