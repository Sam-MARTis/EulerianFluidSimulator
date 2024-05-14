//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;
cell_array = []; //ROW MAJOR
velocityArrayHorizontal = []; //ROW MAJOR
velocityArrayVertical = []; // ROW MAJOR
OVER_RELAXATION_CONSTANT = 1.95;
WIDTH = 100;
HEIGHT = 100;
CELL_SIZE = 5;
GRAVITY = 9.8;
PRESSURE_CONSTANT = 0.02;
TIME_STEP = 0.1;
DIVERGENCE_TOLERENCE = 0.001;

const isAFluidCell = (x, y) => {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
    return false;
  }
  if (cell_array[y][x].isFluid) {
    return true;
  }
  return false;
};

const normalize = (x) => {
  //Normalize to 0-255 from -infty to infty using tan inverse
  return 255 * (0.5 + Math.atan(x) / Math.PI);
};
class VelocityVector {
  constructor(orient = 0, u = 0, v = 0, isImmutable = 0) {
    this.u = u; //horizonatlly forward
    this.v = v; //vertically down
    this.orientation = orient;
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
  };
}
class Cell {
  constructor(x, y, isFluid = 1) {
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    // this.surroundingFluidBlocks = [];
    this.divergence = 0;
    this.pressure = 0;
    let tempVector = new VelocityVector();
    this.velocities = [tempVector, tempVector, tempVector, tempVector]; //left up right down
    this.surroundingFluidBlocksCount = 0;
    this.isFluid = isFluid;

    //Remember to call updateVelocities and updateSurroundingFluidBlocksCount before using the cell
    //Also makeWall
  }
  updateVelocities = () => {
    try {
      this.velocities[0] = velocityArrayHorizontal[this.y][this.x];
      this.velocities[1] = velocityArrayVertical[this.y][this.x];
      this.velocities[2] = velocityArrayHorizontal[this.y][this.x + 1];
      this.velocities[3] = velocityArrayVertical[this.y + 1][this.x];
    } catch (e) {
      console.log(
        velocityArrayHorizontal.length + " " + velocityArrayHorizontal[0].length
      );
      console.log(
        velocityArrayVertical.length + " " + velocityArrayVertical[0].length
      );
      console.log(
        "Error at x: " + this.x + " y: " + this.y + " in updateVelocities"
      );
      console.log(e);
    }
  };
  getVelocitiesValues = () => {
    let velArr = [];
    for (let i = 0; i < this.velocities.length; i++) {
      velArr.push(this.velocities[i].getValue());
    }
    return velArr;
  };
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
    this.divergence = 0;
    for (let i = 0; i < this.velocities.length; i++) {
      this.divergence += (1 - (i < 2) * 2) * this.velocities[i].getValue();
    }
    return this.divergence;
  };
  restartPressure = () => {
    this.pressure = 0;
  };
  makeDivergenceZero = () => {
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].adjustValue(
        ((1 - 2 * (i > 1)) * OVER_RELAXATION_CONSTANT * this.divergence) /
          this.surroundingFluidBlocksCount
      );
    }
    this.pressure -= OVER_RELAXATION_CONSTANT*PRESSURE_CONSTANT*this.divergence;
  };
  makeWall = () => {
    this.isFluid = 0;
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].isImmutable = 1;
    }
  };

  adVectVelocity = () => {
    //TODO
  };
}

const createCells = (width, height) => {
  for (let y = 0; y < height; y++) {
    let row = [];
    for (let x = 0; x < width; x++) {
      row.push(new Cell(x, y, (isFLuid = true)));
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
};

const initializeVelocityVectors = (width, height) => {
  for (let y = 0; y < height; y++) {
    let row = [];
    for (let x = 0; x < width + 1; x++) {
      row.push(new VelocityVector((orient = 1)));
    }
    velocityArrayHorizontal.push(row);
  }
  for (let y = 0; y < height + 1; y++) {
    let row = [];
    for (let x = 0; x < width; x++) {
      row.push(new VelocityVector(1));
    }
    velocityArrayVertical.push(row);
  }
};
//Run boundry copier BEFORE cell velocity assignment
const addCopiedBoundry = () => {
  for (let i = 0; i < velocityArrayHorizontal.length; i++) {
    velocityArrayHorizontal[i][velocityArrayHorizontal[0].length - 1] =
      velocityArrayHorizontal[i][velocityArrayHorizontal[0].length - 2];
  }
  for (let i = 0; i < velocityArrayVertical.length; i++) {
    velocityArrayVertical[i][velocityArrayVertical[0].length - 1] =
      velocityArrayVertical[i][velocityArrayVertical[0].length - 2];
  }
};

const gravityStep = (value) => {
  for (let i = 0; i < velocityArrayVertical.length; i++) {
    for (let j = 0; j < velocityArrayVertical[0].length; j++) {
      velocityArrayVertical[i][j].gravity(value);
    }
  }
};

const makeWalls = () => {
  //Walls at right and left of the simulation
  for (let i = 0; i < cell_array[0].length; i++) {
    cell_array[0][i].makeWall();
    cell_array[cell_array[0].length - 1][i].makeWall();
  }
  //Wall at bottom
  for (let i = 0; i < cell_array.length; i++) {
    cell_array[i][cell_array.length - 1].makeWall();
    cell_array[i][0].makeWall();
  }
  for(let i = 0; i<10; i++){
    for(let j = 0; j< 10; j++){
      cell_array[30+j][40+i].makeWall()
    }
  }
};

const handleDivergence = (count = 1) => {
    for (let i = 0; i < cell_array.length; i++) {
      for (let j = 0; j < cell_array[0].length; j++) {
        cell_array[i][j].restartPressure();
        
      }
    }
    // let trigger = 1;
    for (let iteration = 0; (iteration < count); iteration++) {
      // trigger = 1;
      
    
    //We'll try doing them sepparately. If that doesn't wwork together
    for (let i = 0; i < cell_array.length; i++) {
      for (let j = 0; j < cell_array[0].length; j++) {
        let cellToLookAt = cell_array[i][j]
        let val = cellToLookAt.calculateDivergence()
        if(val>DIVERGENCE_TOLERENCE || val< -DIVERGENCE_TOLERENCE){
          trigger=0;
        }
        
        cellToLookAt.makeDivergenceZero();
      }
    }
  }
};

const mainLoop = () => {
  gravityStep(GRAVITY*TIME_STEP);
  handleDivergence(500)
  
  
  
};

const traverseCells = () => {
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      console.log(cell_array[i][j].isFluid);
    }
  }
};

const displayCells = (cell_size = 3) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      let cellToLookAt = cell_array[j][i];
      cellToLookAt.calculateDivergence()
    
      if (cellToLookAt.isFluid) {
        ctx.fillStyle = `rgb(${normalize(cellToLookAt.pressure)}, 0, ${
          255 - normalize(cellToLookAt.pressure)
        })`;
      } else {
        ctx.fillStyle = "green";
      }
      ctx.fillRect(i * cell_size, j * cell_size, cell_size, cell_size);
    }
  }
};
const init = () => {
  canvas = document.getElementById("fluid-simulator");
  ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;

  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";

  createCells(WIDTH, HEIGHT);
  // traverseCells();
  initializeVelocityVectors(WIDTH, HEIGHT);
  // addCopiedBoundry();
  initializeCells();
  makeWalls();
  displayCells(CELL_SIZE);

  setInterval(mainLoop, Math.floor(1000*TIME_STEP));
  setInterval(() => {displayCells(CELL_SIZE);}, 1000)
  // setInterval(() => {handleDivergence(80);}, 10)
};
//Event Listeners

const debugValues = (e) => {
  // console.log(e);
  let cell =
    cell_array[Math.floor(e.layerY / CELL_SIZE)][
      Math.floor(e.layerX / CELL_SIZE)
    ];
  cell.calculateDivergence();

  console.log(
    `Coordinates: ${e.layerX / CELL_SIZE}, ${
      e.layerY / CELL_SIZE
    }\nPressure of cell is: ${cell.pressure}\nDivergence is ${
      cell.divergence
    }\nVecities are: ${cell.getVelocitiesValues()}`
  );
};

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("mousemove", debugValues);
document.addEventListener("click", mainLoop);
// document.addEventListener("dblclick", displayCells)

let divergenceButton = document.getElementById("divergenceStep");
divergenceButton.addEventListener("click", () => {
  gravityStep(GRAVITY);
});
// setInterval(handleDivergence, 50);
