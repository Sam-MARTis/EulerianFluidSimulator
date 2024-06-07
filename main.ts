//Interfaces
interface ctxObject {
  beginPath: () => void;
  lineTo: (a: number, b: number) => void;
  moveTo: (a: number, b: number) => void;
  stroke: () => void;
  scale: (a: number, b: number) => void;
  strokeStyle: string;
  strokeWidth: number;
}

//End interfaces

//Hyperparameters

let OVER_RELAXATION = 1.6;
let CELL_SIZE = 1;
let BOUNDRY_VEL = 2;
let TIME_STEP = 0.1
//End hyperparameters

//Classes

//Vector
class VelocityVector {
  magnitude: number;
  immutable: boolean;

  constructor(_magnitude: number = 0, _immutable: boolean = false) {
    this.magnitude = _magnitude;
    this.immutable = _immutable;
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
    this.immutable = true
  }
  makeMutable = (): void => {
    this.immutable = false
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
  mutVArr: number[];
  tempVStorage: number[];
  // mutCount: number
  x: number;
  y: number;
  isFLuid: boolean;
  pressure: number = 0;
  cellSize: number = CELL_SIZE;

  constructor(_x: number, _y: number, _isFluid: boolean) {
    this.x = _x;
    this.y = _y;
    this.isFLuid = _isFluid;

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
    if(!this.isFLuid){
        return
    }
    for (let i = 0; i < 4; i++) {
      this.vArr[i].assignValue(this.tempVStorage[i]);
    }
  };

  makeDivergenceFree = (): void => {
    if(!this.isFLuid){
        return
    }
    let divergence: number = 0;
    divergence = this.vl.mag() + this.vu.mag() - this.vr.mag() - this.vd.mag();
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
    for(let i = 0; i<4; i++){
        this.vArr[i].sudoAssignValue(0)
        this.vArr[i].makeImmutable()
        this.isFLuid = false
    }
  }
}
//End Cell

//Fluid
class Fluid {
  dimX: number;
  dimY: number;
  countX: number;
  countY: number;
  horizVArr: VelocityVector[][];
  vertVArr: VelocityVector[][];
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
        row.push(new VelocityVector(0, true));
      }
      this.horizVArr.push(row);
    }
  };
  createVertVelVectors = (): void => {
    let row: VelocityVector[] = [];

    for (let j = 0; j < this.countY; j++) {
      row = [];
      for (let i = 0; i < this.countX; i++) {
        row.push(new VelocityVector(0, true));
      }
      this.vertVArr.push(row);
    }
    this.vertVArr.push(this.vertVArr[0]) //Loops back to the top
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
  };
  applyBoundryConditions = (): void => {
    let currentCell: Cell;
    for(let j= 0; j< this.cellArr.length; j++){
        currentCell = this.cellArr[j][0]
        currentCell.makeObstacle()
        currentCell.vr.sudoAssignValue(BOUNDRY_VEL)
        currentCell.vl.sudoAssignValue(BOUNDRY_VEL)
    }
  }
  maintainAbsorbentBoundry = (): void => {
    let currentCell: Cell;
    for(let j= 0; j< this.cellArr.length; j++){
        currentCell = this.cellArr[j][0]
        // currentCell.makeObstacle()
        currentCell.vr.sudoAssignValue(currentCell.vl.mag())
        // currentCell.vl.sudoAssignValue(BOUNDRY_VEL)
    }
  }


  makeFluidDivergenceFree = (iterations: number): void => {
    for (let c = 0; c < iterations; c++)
      for (let j = 0; j < this.cellArr.length; j++) {
        for (let i = j%2; i < this.cellArr[j].length; i+=2) {
          this.cellArr[j][i].makeDivergenceFree()
        }
      }
      for (let j = 0; j < this.cellArr.length; j++) {
        for (let i = (j+1)%2; i < this.cellArr[j].length; i+=2) {
          this.cellArr[j][i].makeDivergenceFree()
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

  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.moveTo(100, 100);
  ctx.lineTo(200, 200);
  ctx.stroke();

  console.log("Canvas initialised");
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
  
  initGrid();
  initWalls();
  initBoundryConditions();
  initFinalPreparations();
  requestAnimationFrame(mainLoop);
};

//Event listeners
addEventListener("DOMContentLoaded", init);

//End event listeners
