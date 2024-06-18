//Interfaces
interface ctxObject {
  beginPath: () => void;
  lineTo: (a: number, b: number) => void;
  moveTo: (a: number, b: number) => void;
  stroke: () => void;
  scale: (a: number, b: number) => void;
  clearRect: (a: number, b: number, c: number, d: number) => void;
  fillRect: (a: number, b: number, c: number, d: number) => void;

  fillStyle: string;
  strokeStyle: string;
  strokeWidth: number;
}

//End interfaces

//Hyperparameters

let OVER_RELAXATION = 1.998;
let CELL_SIZE = 1;
let BOUNDRY_VEL = 2;
let TIME_STEP = 0.1;
let PRESSURE_CONSTANT = 10;
//End hyperparameters

//Classes

//Vector
class VelocityVector {
  magnitude: number;
  storedMagnitude: number
  immutable: boolean;
  id: number;

  constructor(_magnitude: number = 0, _immutable: boolean = false) {
    this.magnitude = _magnitude;
    this.immutable = _immutable;
    this.id = Math.floor(Math.random() * 10000);
    this.storedMagnitude = _magnitude
  }

  incrementValue = (_value: number): void => {
    if (this.immutable == false) {
      this.magnitude += _value;
    }
  };
  sudoIncrementValue = (_value: number): void => {
    this.magnitude += _value;
  };
  assignValue = (_value: number): void => {
    if (this.immutable == false) {
      this.magnitude = _value;
    }
  };
  sudoAssignValue = (_value: number): void => {
    this.magnitude = _value;
  };
  mag = (): number => {
    return this.magnitude;
  };
  isImmutable = (): boolean => {
    return this.immutable;
  };
  makeImmutable = (): void => {
    this.immutable = true;
  };
  makeMutable = (): void => {
    this.immutable = false;
  };
  storeValues = (val: number): void => {
    if (this.immutable == false) {
      this.storedMagnitude = val;
    }
  }
  sudoStoreValues = (val: number): void => {
    this.storedMagnitude = val
  }
  applyStoredValue = (): void => {
    if(this.immutable ==false){
    this.magnitude = this.storedMagnitude
    }
  }
  sudoApplyStoredValue = (): void => {
    this.magnitude = this.storedMagnitude
  }
}
//End vector

//Cell
class Cell {
  vl: VelocityVector;
  vu: VelocityVector;
  vr: VelocityVector;
  vd: VelocityVector;
  vArr: VelocityVector[];
  mutVArr: number[] = [];
  tempVStorage: number[];
  // mutCount: number
  x: number;
  y: number;
  isFluid: boolean;
  pressure: number = 0;
  cellSize: number = CELL_SIZE;

  constructor(_x: number, _y: number, _isFluid: boolean) {
    this.x = _x;
    this.y = _y;
    this.isFluid = _isFluid;

    // this.mutVArr = [false, false, false, false]
  }

  assignVelocities = (
    _vl: VelocityVector,
    _vu: VelocityVector,
    _vr: VelocityVector,
    _vd: VelocityVector
  ): void => {
    this.vl = _vl;
    this.vu = _vu;
    this.vr = _vr;
    this.vd = _vd;
    this.vArr = [_vl, _vu, _vr, _vd];
  };

  checkSurroundings = (): void => {
    this.mutVArr = [];
    for (let i = 0; i < this.vArr.length; i++) {
      if (!this.vArr[i].isImmutable()) {
        this.mutVArr.push(i);
      }
    }
  };

  queryVelocity = (x0: number, y0: number): number[] => {
    if (this.x - x0 < 0 || this.x - x0 > CELL_SIZE) {
      return [0, 0, 0]; //First value is success/failure
    } else {
      let dx = (this.x - x0) / CELL_SIZE;
      let dy = (this.y - y0) / CELL_SIZE;
      return [
        1,
        this.vl.mag() * (1 - dx) + this.vr.mag() * dx,
        this.vu.mag() * (1 - dx) + this.vd.mag() * dx,
      ];
    }
  };

  recieveVelocities = (
    l: number | boolean,
    u: number | boolean,
    r: number | boolean,
    d: number | boolean
  ): void => {
    if (typeof l === "boolean") {
      l = this.vl.mag();
    }
    if (typeof u === "boolean") {
      u = this.vu.mag();
    }
    if (typeof r === "boolean") {
      r = this.vr.mag();
    }
    if (typeof d === "boolean") {
      d = this.vd.mag();
    }
    this.tempVStorage = [l, u, r, d];
  };

  applyVelocityValues = (): void => {
    if (!this.isFluid) {
      return;
    }
    for (let i = 0; i < 4; i++) {
      this.vArr[i].assignValue(this.tempVStorage[i]);
    }
  };

  makeDivergenceFree = (): void => {
    if (!this.isFluid) {
      return;
    }
    let divergence: number = 0;
    divergence = this.vl.mag() + this.vu.mag() - this.vr.mag() - this.vd.mag();
    // console.log(divergence)
    // let mutLen = this.mutVArr.length
    this.pressure += divergence;
    divergence /= this.mutVArr.length;
    divergence *= OVER_RELAXATION;

    this.vl.incrementValue(-1 * divergence);
    this.vu.incrementValue(-1 * divergence);
    this.vr.incrementValue(divergence);
    this.vd.incrementValue(divergence);
  };
  resetPressure = (): void => {
    this.pressure = 0;
  };

  makeObstacle = (): void => {
    for (let i = 0; i < 4; i++) {
      this.vArr[i].sudoAssignValue(0);
      this.vArr[i].makeImmutable();
      this.isFluid = false;
    }
  };
}
//End Cell

//Fluid
class Fluid {
  dimX: number = 0;
  dimY: number = 0;
  countX: number = 0;
  countY: number = 0;
  horizVArr: VelocityVector[][] = [];
  vertVArr: VelocityVector[][] = [];
  cellArr: Cell[][] = [];

  constructor(_countX: number, _countY: number) {
    this.countX = _countX;
    this.countY = _countY;
  }

  createCells = (): void => {
    let row: Cell[] = [];

    for (let j = 0; j < this.countY; j++) {
      row = [];
      for (let i = 0; i < this.countX; i++) {
        row.push(new Cell(i * CELL_SIZE, j * CELL_SIZE, true));
      }
      this.cellArr.push(row);
    }
  };

  createHorizVelVectors = (): void => {
    let row: VelocityVector[] = [];

    for (let j = 0; j < this.countY; j++) {
      row = [];
      for (let i = 0; i < this.countX + 1; i++) {
        row.push(new VelocityVector(0, false));
      }
      this.horizVArr.push(row);
    }
  };
  createVertVelVectors = (): void => {
    let row: VelocityVector[] = [];

    for (let j = 0; j < this.countY; j++) {
      row = [];
      for (let i = 0; i < this.countX; i++) {
        row.push(new VelocityVector(0, false));
      }
      this.vertVArr.push(row);
    }
    this.vertVArr.push(this.vertVArr[0]); //Loops back to the top
  };

  bindVelocitiesToCell = (): void => {
    for (let j = 0; j < this.cellArr.length; j++) {
      for (let i = 0; i < this.cellArr[j].length; i++) {
        this.cellArr[j][i].assignVelocities(
          this.horizVArr[j][i],
          this.vertVArr[j][i],
          this.horizVArr[j][i + 1],
          this.vertVArr[j + 1][i]
        );
      }
    }
    for (let j = 0; j < this.cellArr.length; j++) {
      for (let i = 0; i < this.cellArr[0].length; i++) {
        this.cellArr[j][i].checkSurroundings();
      }
    }
  };
  applyBoundryConditions = (): void => {
    let currentCell: Cell;
    for (let j = 0; j < this.cellArr.length; j++) {
      currentCell = this.cellArr[j][0];
      currentCell.makeObstacle();
      currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
      currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
      currentCell = this.cellArr[j][1];
      currentCell.makeObstacle();
      currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
      currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
      currentCell = this.cellArr[j][2];
      currentCell.makeObstacle();
      currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
      currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
    }
    for(let j = 0; j< 30; j++){
      currentCell = this.cellArr[j][j];
      currentCell.makeObstacle();
      currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
      currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
    }
  };
  maintainAbsorbentBoundry = (): void => {
    let currentCell: Cell;
    for (let j = 0; j < this.cellArr.length; j++) {
      currentCell = this.cellArr[j][0];
      // currentCell.makeObstacle()
      currentCell.vr.sudoAssignValue(currentCell.vl.mag());
      // currentCell.vl.sudoAssignValue(BOUNDRY_VEL)
    }
  };

  makeFluidDivergenceFree = (iterations: number): void => {
    for (let c = 0; c < iterations; c++) {
      this.maintainAbsorbentBoundry();

      for (let i = 0; i < this.cellArr[0].length; i++) {
        for (let j = 0; j < this.cellArr.length; j++) {
          this.cellArr[j][i].makeDivergenceFree();
        }
      }

      for (let j = 0; j < this.cellArr.length; j++) {
        for (let i = 0; i < this.cellArr[j].length; i++) {
          this.cellArr[j][i].makeDivergenceFree();
        }
      }
      for (let j = 0; j < this.cellArr.length; j++) {
        for (let i = j % 2; i < this.cellArr[j].length; i += 2) {
          this.cellArr[j][i].makeDivergenceFree();
        }
      }

      for (let j = 0; j < this.cellArr.length; j++) {
        for (let i = (j + 1) % 2; i < this.cellArr[j].length; i += 2) {
          this.cellArr[j][i].makeDivergenceFree();
        }
      }
      for (let j = 0; j < this.cellArr.length; j++) {
        for (let i = 0; i < this.cellArr[j].length; i++) {
          this.cellArr[j][i].makeDivergenceFree();
        }
      }
      for (let i = 0; i < this.cellArr[0].length; i++) {
        for (let j = 0; j < this.cellArr.length; j++) {
          this.cellArr[j][i].makeDivergenceFree();
        }
      }
    }
  };

  queryVelocityAt = (x: number, y: number): number[] => {
    if (x < 0) {
      x = 0;
    }
    if (x > this.countX * CELL_SIZE - 1) {
      x = this.countX * CELL_SIZE - 1;
    }
    while (y <= -1) {
      y += this.countY * CELL_SIZE;
    }
    while (y >= this.countY * CELL_SIZE) {
      y -= this.countY * CELL_SIZE;
    }

    let y_norm = y / CELL_SIZE;
    let x_norm = x / CELL_SIZE;
    let dx: number;
    let dy: number;
    let x_switch: number;
    let y_switch: number;

    let velXArr: number[] = [];
    let velYArr: number[] = [];

    dy = y_norm - Math.floor(y_norm);
    dx = x_norm - Math.floor(x_norm);
    let xVelWeights: number[] = [];
    let yVelWeights: number[] = [];

    if (dy > 0.5) {
      y_switch = 1;
    } else {
      y_switch = -1;
    }
    if (dx > 0.5) {
      x_switch = 1;
    } else {
      x_switch = -1;
    }
    let CellX: Cell;
    let CellY: Cell;

    let currentCell = this.cellArr[Math.floor(y_norm)][Math.floor(x_norm)];
    if (
      x_norm >= 1 &&
      x_norm < this.countX - 1 &&
      y_norm >= 1 &&
      y_norm < this.countY - 1
    ) {
      CellX = this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
      CellY = this.cellArr[Math.floor(y_norm) + y_switch][Math.floor(x_norm)];
    }
    else if (x_norm < 1) {
      if (x_switch == -1) {
        return [BOUNDRY_VEL, 0];
      } else {
        CellX = this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
      }
    } else {
      if (x_norm > this.countX - 1) {
        if (x_switch == 1) {
          CellX = currentCell;
        } else {
          CellX =
            this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
        }
      } else {
        CellX = this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
      }
    }
    if ((y_norm < 1) && (y_switch == -1)) {
      CellY = this.cellArr[this.cellArr.length - 1][Math.floor(x_norm)];
    } else if ((y_norm >= (this.countY - 1)) && (y_switch == 1)) {
        CellY = this.cellArr[0][Math.floor(x_norm)];
      } else {
        CellY = this.cellArr[Math.floor(y_norm) + y_switch][Math.floor(x_norm)];
      }

    velXArr = [
      currentCell.vl.mag(),
      currentCell.vr.mag(),
      CellX.vl.mag(),
      CellX.vr.mag(),
    ];
    velYArr = [
      currentCell.vd.mag(),
      currentCell.vu.mag(),
      CellY.vd.mag(),
      CellY.vu.mag(),
    ];

    if (x_switch == 1) {
      yVelWeights = [
        (1 - (dx - 0.5)) * dy,
        (1 - (dx - 0.5)) * (1 - dy),
        (dx - 0.5) * dy,
        (dx - 0.5) * (1 - dy),
      ];
    } else {
      yVelWeights = [
        (1 - (0.5 - dx)) * dy,
        (1 - (0.5 - dx)) * (1 - dy),
        (0.5 - dx) * dy,
        (0.5 - dx) * (1 - dy),
      ];
    }
    if (y_switch == 1) {
      xVelWeights = [
        (1 - dx) * (1 - (dy - 0.5)),
        dx * (1 - (dy - 0.5)),
        (1 - dx) * (dy - 0.5),
        dx * (dy - 0.5),
      ];
    } else {
      xVelWeights = [
        (1 - dx) * (1 - (0.5 - dy)),
        dx * (1 - (0.5 - dy)),
        (1 - dx) * (0.5 - dy),
        dx * (0.5 - dy),
      ];
    }

    let vx: number = 0;
    let vy: number = 0;
    for (let i = 0; i < 4; i++) {
      vx += velXArr[i] * xVelWeights[i];
      vy += velYArr[i] * yVelWeights[i];
    }
    return [vx, vy];
  };
  advectVeclocityAt = (x: number, y: number, dt: number): number[] => {
    let vel = this.queryVelocityAt(x, y)
    let intermediateVel = this.queryVelocityAt(x - (vel[0]*dt/2), y-(vel[1]*dt/2))
    return this.queryVelocityAt(x - (intermediateVel[0]*dt), y - (intermediateVel[1]*dt))
  }

  advectVelocityOfCell = (): void => {
    let currentCell: Cell;
    let x:number, y: number
    

    for(let j=0; j< this.cellArr.length; j++){
      for(let i=1; i<this.cellArr[0].length; i++){
        try{
        currentCell = this.cellArr[j][i];
        x = currentCell.x
        y = currentCell.y
        currentCell.vl.storeValues(this.advectVeclocityAt(x, y, TIME_STEP)[0])
        currentCell.vr.storeValues(this.advectVeclocityAt(x+1, y, TIME_STEP)[0])
        currentCell.vu.storeValues(this.advectVeclocityAt(x, y-1, TIME_STEP)[0])
        currentCell.vd.storeValues(this.advectVeclocityAt(x, y+1, TIME_STEP)[0])
      }
      catch{
         console.error("Error at: ", i, ", ", j, "\n")
      }
    }
    }
    for(let j=0; j< this.cellArr.length; j++){
      for(let i=1; i<this.cellArr[0].length; i++){
        currentCell = this.cellArr[j][i];
        x = currentCell.x
        y = currentCell.y
        currentCell.vl.applyStoredValue()
        currentCell.vr.applyStoredValue()
        currentCell.vu.applyStoredValue()
        currentCell.vd.applyStoredValue()
      }
    }


  };
}

//End fluid

//End classes

//Global variables
let canvas: any;
let ctx: ctxObject;
let fluid: Fluid;
//End globals

const initCanvas = (): void => {
  canvas = document.getElementById("fluid-simulator");
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx = canvas.getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);

  console.log("Canvas initialised");
};

const display = (): void => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let cell: Cell;
  let colourParameter: number;
  console.log(fluid.cellArr.length);
  for (let j = 0; j < fluid.cellArr.length; j++) {
    for (let i = 0; i < fluid.cellArr[0].length; i++) {
      cell = fluid.cellArr[j][i];

      if (cell.isFluid) {
        colourParameter = cell.pressure * PRESSURE_CONSTANT;

        ctx.fillStyle = `rgb(${colourParameter}, 0, ${255 - colourParameter})`;
      } else {
        ctx.fillStyle = "green";
      }
      ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
};
const initGrid = (): void => {
  console.log("Grid initialised");
};

const initWalls = (): void => {
  console.log("Walls initialised");
};

const initBoundryConditions = (): void => {
  console.log("Boundry consitions initialized");
};

const initFinalPreparations = (): void => {
  console.log("Final preparations complete");
};

const mainLoop = (): void => {
  requestAnimationFrame(mainLoop);
};

const init = (): void => {
  initCanvas();
  fluid = new Fluid(200, 200);
  fluid.createCells();
  fluid.createHorizVelVectors();
  fluid.createVertVelVectors();
  fluid.bindVelocitiesToCell();
  fluid.applyBoundryConditions();
  fluid.makeFluidDivergenceFree(100);
  display();
  setInterval(()=> {
    fluid.advectVelocityOfCell()
    fluid.makeFluidDivergenceFree(20)
  }, 200)
  console.log("Display completed");
};

/*
//






//





//
*/

const debugValues = (e: any): void => {
  let cell =
    fluid.cellArr[Math.floor(e.layerY / CELL_SIZE)][
      Math.floor(e.layerX / CELL_SIZE)
    ];

  console.log(
    `Coordinates: ${e.layerX / CELL_SIZE}, ${
      e.layerY / CELL_SIZE
    }\nIsWall: ${!cell.isFluid}\nPressure of cell is: ${cell.pressure}
    \n Velocities:
    \nvl: ${cell.vl.mag()}, ${cell.vl.isImmutable()}, ${cell.vl.id}
    \nvu: ${cell.vu.mag()}, ${cell.vu.isImmutable()}, ${cell.vu.id}
    \nvr: ${cell.vr.mag()}, ${cell.vr.isImmutable()}, ${cell.vr.id}
    \nvd: ${cell.vd.mag()}, ${cell.vd.isImmutable()}, ${cell.vd.id}`
  );
};

let button: any = document.getElementById("divergenceStep");

//Event listeners
addEventListener("DOMContentLoaded", init);
addEventListener("mousemove", debugValues);
button.addEventListener("click", () => {
  console.log("Divergence calculating");
  fluid.makeFluidDivergenceFree(100);
});

//End event listeners
