//Globals
let canvas;
let ctx;
let devicePixelRatio = window.devicePixelRatio || 1;
let cell_array = []; //ROW MAJOR
let wall_array = [];
let velocityArrayHorizontal = []; //ROW MAJOR
let velocityArrayVertical = []; // ROW MAJOR
OVER_RELAXATION_CONSTANT = 1.95;
WIDTH = 100;
HEIGHT = 100;
CELL_SIZE = 5;
let streamX;
let streamY;
let streamTrigger;

// GRAVITY = 9.8;
GRAVITY = 0;
PRESSURE_CONSTANT = 600;
TIME_STEP = 0.001;
DIVERGENCE_TOLERENCE = 0.001;
BOUNDRY_VELOCITY = 5;



const isAFluidCell = (x, y) => {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
    return false;
  }
  if (cell_array[Math.floor(y)][Math.floor(x)].isFluid) {
    return true;
  }
  return false;
};

const normalize = (x) => {
  //Normalize to 0-255 from -infty to infty using tan inverse
  // return 255 * (0.5 + Math.atan(x) / Math.PI);
  return 255 * (1 - 1 / (1 + 0.2 * 1.4 ** (x / 2)));
};
class VelocityVector {
  constructor(orient = 0, u = 0, v = 0, isImmutable = 0) {
    this.u = u; //horizonatlly forward
    this.v = v; //vertically down
    this.orientation = orient;
    this.isImmutable = isImmutable;
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
  sudoUpdateValues = (u, v) => {
    this.u = u;
    this.v = v;
    // return this;
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
  copyThis = () => {
    let newVec = new VelocityVector(
      this.orientation,
      this.u,
      this.v,
      this.isImmutable
    );
    return newVec;
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
    // try {
    this.velocities[0] = velocityArrayHorizontal[this.y][this.x];
    this.velocities[1] = velocityArrayVertical[this.y][this.x];
    this.velocities[2] = velocityArrayHorizontal[this.y][this.x + 1];
    this.velocities[3] = velocityArrayVertical[this.y + 1][this.x];

  };
  getVelocitiesValues = () => {
    let velArr = [];
    for (let i = 0; i < this.velocities.length; i++) {
      velArr.push(this.velocities[i]);
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
    this.pressure -=
      OVER_RELAXATION_CONSTANT * PRESSURE_CONSTANT * this.divergence;
  };
  makeWall = () => {
    this.isFluid = 0;
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].sudoUpdateValues(0,0);
      this.velocities[i].isImmutable = 1;
    }
  };
  unmakeWall = () => {
    this.isFluid = 1;
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].isImmutable = 0;
    }
  };

  advectVelocity = () => {
    let dx, dy, midVel, finalVel;
    if (!this.isFluid) {
      return;
    }
    if (isAFluidCell(this.x - 1, this.y)) {
      //For left vel
      dx = this.velocities[0].getValue() * TIME_STEP;
      dy =
        ((this.velocities[1].getValue() +
          this.velocities[3].getValue() +
          cell_array[this.y][this.x - 1].velocities[1].getValue() +
          cell_array[this.y][this.x - 1].velocities[3].getValue()) *
          TIME_STEP) /
        4;
      midVel = findVelocityAtPoint(this.x - dx/2, this.y + 0.5 - dy/2);
      if(!(midVel===0)){
      finalVel = findVelocityAtPoint(
        this.x - midVel[0] * TIME_STEP,
        this.y + 0.5 - midVel[1] * TIME_STEP
      ); //RUNGA KUTTA
      if(!(finalVel===0)){
      this.velocities[0].updateValues(finalVel[0], finalVel[1]);
      }
    }
  }
    if (isAFluidCell(this.x + 1, this.y)) {
      //For right vel
      dx = this.velocities[2].getValue() * TIME_STEP;
      dy =
        ((this.velocities[1].getValue() +
          this.velocities[3].getValue() +
          cell_array[this.y][this.x + 1].velocities[1].getValue() +
          cell_array[this.y][this.x + 1].velocities[3].getValue()) *
          TIME_STEP) /
        4;
      midVel = findVelocityAtPoint(this.x + 1 - dx/2, this.y + 0.5 - dy/2);
      if(!(midVel===0)){
      finalVel = findVelocityAtPoint(
        this.x + 1 - midVel[0] * TIME_STEP,
        this.y + 0.5 - midVel[1] * TIME_STEP
      ); //RUNGA KUTTA
      if(!(finalVel===0)){
      this.velocities[2].updateValues(finalVel[0], finalVel[1]);
      }
    }
  }
    if (isAFluidCell(this.x, this.y - 1)) {
      //For top vel
      dy = this.velocities[1].getValue() * TIME_STEP;
      dx =
        ((this.velocities[0].getValue() +
          this.velocities[2].getValue() +
          cell_array[this.y - 1][this.x].velocities[0].getValue() +
          cell_array[this.y - 1][this.x].velocities[2].getValue()) *
          TIME_STEP) /
        4;
      midVel = findVelocityAtPoint(this.x + 0.5 - dx/2, this.y - dy/2);
      if(!(midVel===0)){
      finalVel = findVelocityAtPoint(
        this.x + 0.5 - midVel[0] * TIME_STEP,
        this.y - midVel[1] * TIME_STEP
      ); //RUNGA KUTTA
      if(!(finalVel===0)){
      this.velocities[1].updateValues(finalVel[0], finalVel[1]);
      }
    }
    }
    if (isAFluidCell(this.x, this.y + 1)) {
      //For down vel
      dy = this.velocities[3].getValue() * TIME_STEP;
      dx =
        ((this.velocities[0].getValue() +
          this.velocities[2].getValue() +
          cell_array[this.y + 1][this.x].velocities[0].getValue() +
          cell_array[this.y + 1][this.x].velocities[2].getValue()) *
          TIME_STEP) /
        4;
      midVel = findVelocityAtPoint(this.x + 0.5 - dx/2, this.y + 1 - dy/2);
      if(!(midVel===0)){
      finalVel = findVelocityAtPoint(
        this.x + 0.5 - midVel[0] * TIME_STEP,
        this.y + 1 - midVel[1] * TIME_STEP
      ); //RUNGA KUTTA
      if(!(finalVel===0)){
      this.velocities[3].updateValues(finalVel[0], finalVel[1]);
      }
    }
    }

    //TODO
  };

  
}

const findVelocityAtPoint = (x, y) => {
  let cell_x = Math.floor(x);
  let cell_y = Math.floor(y);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
    return 0;
  }
  let dx = x - cell_x;
  let dy = y - cell_y;
  try{
    let velocitiesToConsider = cell_array[cell_y][cell_x].velocities;
    return [
      velocitiesToConsider[0].getValue() * (1 - dx) +
        velocitiesToConsider[2].getValue() * dx,
      velocitiesToConsider[1].getValue() * (1 - dy) +
        velocitiesToConsider[3].getValue() * dy,
    ];}
  catch (e) {
    console.log(e);
    console.log(cell_x, cell_y);
  }
};

const createCells = (width, height) => {
  for (let y = 0; y < HEIGHT; y++) {
    let row = [];
    for (let x = 0; x < WIDTH; x++) {
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
      row.push(new VelocityVector(orient = 0));
    }
    velocityArrayHorizontal.push(row);
  }
  for (let y = 0; y < height + 1; y++) {
    let row = [];
    for (let x = 0; x < width; x++) {
      row.push(new VelocityVector(orient= 1));
    }
    velocityArrayVertical.push(row);
  }
};

const copyCell = (fromIndex, toIndex) => {
  velocityArrayHorizontal[toIndex[1]][toIndex[0]] = velocityArrayHorizontal[fromIndex[1]][fromIndex[0]].copyThis();
  velocityArrayVertical[toIndex[1]][toIndex[0]] = velocityArrayVertical[fromIndex[1]][fromIndex[0]].copyThis();
  velocityArrayHorizontal[toIndex[1]][toIndex[0]+1] = velocityArrayHorizontal[fromIndex[1]][fromIndex[0]+1].copyThis();
  velocityArrayVertical[toIndex[1]+1][toIndex[0]] = velocityArrayVertical[fromIndex[1]+1][fromIndex[0]].copyThis();
  cell_array[toIndex[1]][toIndex[0]].updateVelocities();
}


//Run boundry copier BEFORE cell velocity assignment
const addCopiedBoundry = () => {


  for (let i = 0; i < cell_array.length; i++) {
    copyCell([WIDTH - 2, i], [WIDTH - 1, i]);
    // copyCell([WIDTH - 4, i], [WIDTH - 2, i]);
    // copyCell([WIDTH - 6, i], [WIDTH - 3, i]);
    // copyCell([WIDTH - 7, i], [WIDTH - 4, i]);
    copyCell([2, i], [0, i]);
    copyCell([3, i], [1, i]);
    // copyCell([5, i], [2, i]);
    // copyCell([6, i], [3, i]);
  
  }

};

const gravityStep = (value) => {
  for (let i = 0; i < velocityArrayVertical.length; i++) {
    for (let j = 0; j < velocityArrayVertical[0].length; j++) {
      velocityArrayVertical[i][j].gravity(value);
    }
  }
};

const makeObstacle = () =>{
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      cell_array[30 + j+i][40 + i].makeWall();
    }
  }

}

const makeWalls = () => {
  //Walls at right and left of the simulation
  for (let i = 0; i < cell_array[0].length; i++) {
    cell_array[0][i].makeWall();
    cell_array[cell_array.length - 1][i].makeWall();
  }
  //Wall at bottom
  for (let i = 0; i < cell_array.length; i++) {
    // cell_array[i][cell_array.length - 1].makeWall();
    // cell_array[i][0].velocities[2].u = BOUNDRY_VELOCITY;
    // cell_array[i][0].makeWall();
  }
  makeObstacle();
};

const unmakeWalls = () => {
  // for (let i = 0; i < cell_array[0].length; i++) {
  //   cell_array[0][i].unmakeWall();
  //   cell_array[cell_array.length - 1][i].unmakeWall();
  // }
  for (let i = 0; i < cell_array.length; i++) {
    cell_array[i][0].unmakeWall();
    cell_array[i][cell_array.length[0] - 1].unmakeWall();
  }
};

const trackWalls = () => {
  wall_array = [];
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      if (!cell_array[i][j].isFluid) {
        wall_array.push([i, j]);
      }
    }
  }

}
updateWalls = () => {
  for(let i = 0; i < wall_array.length; i++) {
    cell_array[wall_array[i][0]][wall_array[i][1]].makeWall();
  } 

}

// const updateVelicties = () => {
//   for cell
// }

const boundryConditions = () => {
  updateWalls();
  for (let i = 0; i < velocityArrayHorizontal.length; i++) {
    velocityArrayHorizontal[i][0].sudoUpdateValues(BOUNDRY_VELOCITY, 0);
    velocityArrayHorizontal[i][1].sudoUpdateValues(BOUNDRY_VELOCITY, 0);
    // velocityArrayHorizontal[i][velocityArrayHorizontal[0].length - 1].sudoUpdateValues( BOUNDRY_VELOCITY, 0);
    // velocityArrayHorizontal[i][velocityArrayHorizontal[0].length - 2].sudoUpdateValues(BOUNDRY_VELOCITY, 0);
  }
  for (let i = 0; i < velocityArrayVertical[0].length; i++) {
    velocityArrayVertical[0][i].sudoUpdateValues(0, 0);
    velocityArrayVertical[1][i].sudoUpdateValues(0, 0);
    velocityArrayVertical[velocityArrayVertical.length - 1][i].sudoUpdateValues(0, 0);
    velocityArrayVertical[velocityArrayVertical.length - 2][i].sudoUpdateValues(0, 0);
  }
};

const handleDivergence = (count = 1) => {
  for (let i = 0; i < cell_array.length; i++) {
    for (let j = 0; j < cell_array[0].length; j++) {
      cell_array[i][j].restartPressure();
    }
  }
  // let trigger = 1;
  for (let iteration = 0; iteration < count; iteration++) {
    boundryConditions()
    // addCopiedBoundry();
    // trigger = 1;

    //We'll try doing them sepparately. If that doesn't wwork together
    for (let i = 0; i < cell_array.length; i++) {
  
      for (let j = (i+iteration)%2; j < cell_array[0].length; j+=2) {
        let cellToLookAt = cell_array[i][j];
        if(!cellToLookAt.isFluid){
          continue;
        }
        let val = cellToLookAt.calculateDivergence();
        // if (val > DIVERGENCE_TOLERENCE || val < -DIVERGENCE_TOLERENCE) {
        //   trigger = 0;
        // }

        cellToLookAt.makeDivergenceZero();
        
      }
    }
  }
};

const handleAdvection = () => {
  boundryConditions();
  for(let i = 0; i < cell_array.length; i++) {
    for(let j = 0; j < cell_array[0].length; j++) {
      try{
        cell_array[i][j].advectVelocity();
      }
      catch(e) {
        console.log('From handle advection' + e);
        console.log(i, j);
      }
      // cell_array[i][j].advectVelocity();
    }
  }
  // removeWalls();
  // advectVelocity();
  // addWalls();
};

const mainLoop = () => {
  gravityStep(GRAVITY * TIME_STEP);
  handleDivergence(300);
  handleAdvection();
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
  for (let i = 0; i < HEIGHT; i++) {
    for (let j = 0; j < WIDTH; j++) {
      let cellToLookAt = cell_array[i][j];
      cellToLookAt.calculateDivergence();

      if (cellToLookAt.isFluid) {
        ctx.fillStyle = `rgb(${normalize(cellToLookAt.pressure)}, 0, ${
          255 - normalize(cellToLookAt.pressure)
        })`;
      } else {
        ctx.fillStyle = "green";
      }
      ctx.fillRect(j * cell_size, i * cell_size, cell_size, cell_size);
    }
  }

  if(streamTrigger>0){
    let x = streamX;
    let y = streamY;
    let dx = 0;
    let dy = 0;
    let stride = 0.001
    // let midVel, finalVel;
    for(let i = 0; i < 100000; i++){
      if(!isAFluidCell(x, y)){
        streamTrigger = 0;
        break
  
      }
      dx = findVelocityAtPoint(x, y)[0] * stride;
      dy = findVelocityAtPoint(x, y)[1] * stride;
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.moveTo(x * cell_size, y * cell_size);
      ctx.lineTo((x + dx) * cell_size, (y + dy) * cell_size);
      ctx.stroke();
      x+=dx;
      y+=dy;
    }
    streamTrigger--;
  
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
  
  makeWalls();
  makeObstacle();
  boundryConditions();
  

  initializeCells();
  makeWalls();
  displayCells(CELL_SIZE);

  setInterval(mainLoop, Math.floor(100));
  setInterval(() => {
    displayCells(CELL_SIZE);
  }, 1000);
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
  let vels = cell.getVelocitiesValues();


  console.log(
    `Coordinates: ${e.layerX / CELL_SIZE}, ${
      e.layerY / CELL_SIZE
    }\nIsWall: ${!cell.isFluid}\nPressure of cell is: ${cell.pressure}\nDivergence is ${
      cell.divergence
    }\nVecities are: \n${vels[0].getValue()} isImmuatble: ${vels[0].isImmutable}\n ${vels[1].getValue()} isImmuatble: ${vels[1].isImmutable}\n ${vels[2].getValue()} isImmuatble: ${vels[2].isImmutable}\n ${vels[3].getValue()} isImmuatble: ${vels[3].isImmutable} `
  );
};
const streamline = (e) => {
  streamX = e.layerX/CELL_SIZE;
  streamY = e.layerY/CELL_SIZE;
  streamTrigger = 5;
  }

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("mousemove", debugValues);
document.addEventListener("click", streamline);
// document.addEventListener("dblclick", displayCells)

let divergenceButton = document.getElementById("divergenceStep");
divergenceButton.addEventListener("click", () => {
  console.log('Doing divergence');
  
  handleDivergence(1000);
});
// setInterval(handleDivergence, 50);
