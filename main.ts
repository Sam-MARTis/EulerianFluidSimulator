const canvas = document.getElementById("projectCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
if (ctx === null) {
  throw new Error("Context is null");
}

//Constants
const OVER_RELAXATION = 1.4;
const LEFT_BOUNDARY_Vel = 2;
const CELL_SIZE = 1;
const DRAW_SCALE = 5;

//End constants
console.clear();

class Vector {
  x: number;
  y: number;
  x_stored: number;
  y_stored: number;
  isMutable: boolean = true;
  constructor(x: number, y: number, isMutable: boolean = true) {
    this.x = x;
    this.y = y;
    this.x_stored = x;
    this.y_stored = y;
    this.isMutable = isMutable;
  }
  update = (x: number, y: number, override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x = x;
      this.y = y;
      this.x_stored = x;
      this.y_stored = y;
    }
  };
  setMutability = (isMutable: boolean): void => {
    this.isMutable = isMutable;
  }

  increment = (x: number, y: number, override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x += x;
      this.y += y;
      this.x_stored = this.x;
      this.y_stored = this.y;
    }
  };
  cache = (x: number, y: number, override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x_stored = x;
      this.y_stored = y;
    }
  };

  cacheVec = (vec: Vector, override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x_stored = vec.x;
      this.y_stored = vec.y;
    }
  };
  addToCache = (x: number, y: number, override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x_stored += x;
      this.y_stored += y;
    }
  };
  addToCacheVec = (vec: Vector, override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x_stored += vec.x;
      this.y_stored += vec.y;
    }
    // this.x_stored += vec.x;
    // this.y_stored += vec.y;
  };

  applyCache = (override: boolean = false): void => {
    if (this.isMutable || override) {
      this.x = this.x_stored;
      this.y = this.y_stored;
    }
    // this.x = this.x_stored;
    // this.y = this.y_stored;
  };
}

const normaliseDivergenceToColour = (divergence: number, normalizationFactor: number): number => {
  // return Math.exp(-((divergence/normalizationFactor)**2));
  return 0.5 + Math.tanh(divergence/normalizationFactor)/Math.PI;
}


class Cell {
  pos: Vector;
  size: number;
  isWall: boolean;
  vectors: Vector[] = [];
  vl: Vector;
  vu: Vector;
  vr: Vector;
  vd: Vector;

  constructor(
    pos: Vector,
    size: number,
    isWall: boolean,
    vl: Vector,
    vu: Vector,
    vr: Vector,
    vd: Vector
  ) {
    this.pos = pos;
    this.size = size;
    this.isWall = isWall;
    this.vl = vl;
    this.vu = vu;
    this.vr = vr;
    this.vd = vd;
    this.vectors = [this.vl, this.vu, this.vr, this.vd];
  }

  findDivergence = (): number => {
    return this.vl.x - this.vr.x + this.vu.y - this.vd.y;
  };
  makeDivergenceZero = (): void => {
    // try{
    const divergence = this.findDivergence();
    // }
    // catch{
    //   console.table(this.vectors);
    //   console.log("X: ", this.pos.x, "Y: ", this.pos.y);
    // }
    let mutableVectorsCount = 0;
    for (let i = 0; i < this.vectors.length; i++) {
      if (this.vectors[i].isMutable) {
        mutableVectorsCount++;
      }
    }
    if (mutableVectorsCount == 0) {
      if (this.isWall) {
        return;
      }
      throw new Error("No mutable vectors found in cell. Divergence zero failed");
    }

    const divergencePerVector = divergence / mutableVectorsCount;
    this.vl.increment(-(OVER_RELAXATION) * divergencePerVector, 0)
    this.vr.increment((OVER_RELAXATION) * divergencePerVector, 0)
    this.vu.increment(0, -(OVER_RELAXATION) * divergencePerVector)
    this.vd.increment(0, (OVER_RELAXATION) * divergencePerVector)

    // this.vl.x -= (OVER_RELAXATION) * divergencePerVector;
    // this.vr.x += (OVER_RELAXATION) * divergencePerVector;
    // this.vu.y -= (OVER_RELAXATION) * divergencePerVector;
    // this.vd.y += (OVER_RELAXATION) * divergencePerVector;
  };
  // makeDivergenceZeroCache = (): void => {
  //   const divergence = this.findDivergence();
  //   // this.vl.addToCache((-OVER_RELAXATION * divergence) / 4, 0);
  //   // this.vr.addToCache((OVER_RELAXATION * divergence) / 4, 0);
  //   // this.vu.addToCache(0, (-OVER_RELAXATION * divergence) / 4);
  //   // this.vd.addToCache(0, (OVER_RELAXATION * divergence) / 4);
  // };

  applyVectorCache = (): void => {
    this.vl.applyCache();
    this.vu.applyCache();
    this.vr.applyCache();
    this.vd.applyCache();
  };

  // findVelocityAtPoint = (point: Vector): Vector|number =>{
  //     const x = (point.x - this.pos.x)/this.size;
  //     const y = (point.y - this.pos.y)/this.size;
  //     if(x<0 || x>1 || y<0 || y>1){
  //         return 0;
  //     }
  //     if(x<0.5){
  //         if(y<0.5){
  //             return this.vl;
  //         }else{
  //             return this.vd;
  //         }
  //     }
  //     else{
  //         if(y<0.5){
  //             return this.vu;
  //         }else{
  //             return this.vr;
  //         }
  //     }

  //     return new Vector(0, 0)
  // }
}

class Fluid {
  cells: Cell[][] = [];
  dimensions: Vector;
  cellSize: number;
  cellCount: Vector;
  vectorsListVert: Vector[][] = [];
  vectorsListHoriz: Vector[][] = [];

  constructor(x_dim: number, y_dim: number, cellSize: number) {
    this.dimensions = new Vector(x_dim, y_dim);
    this.cellSize = cellSize;
    this.cellCount = new Vector(
      Math.floor(x_dim / cellSize),
      Math.floor(y_dim / cellSize)
    );
    this.createCells();
  }

  createCells = (): void => {
    // Initialize horizontal vectors
    this.vectorsListHoriz = [];
    this.vectorsListVert = [];
    for (let i = 0; i < this.cellCount.y; i++) {
      this.vectorsListHoriz.push([]);
      for (let j = 0; j < this.cellCount.x + 1; j++) {
        this.vectorsListHoriz[i].push(new Vector(0, 0));
      }
    }

    for (let i = 0; i < this.cellCount.y+1; i++) {
      this.vectorsListVert.push([]);
      for (let j = 0; j < this.cellCount.x; j++) {
        this.vectorsListVert[i].push(new Vector(0, 0));
      }
    }
    for (let i = 0; i < this.cellCount.y; i++) {
      this.vectorsListHoriz[i][0] = new Vector(LEFT_BOUNDARY_Vel, 0, false);
    }
    for(let i = 0; i < this.cellCount.x; i++){
      this.vectorsListVert[0][i] = new Vector(0, 0, false);
      this.vectorsListVert[this.vectorsListVert.length-1][i] = new Vector(0, 0, false);
    }

    // for (let i = 0; i < this.cellCount.y; i++) {
    //   this.vectorsListHoriz.push([]);
    //   this.vectorsListHoriz[i].push(new Vector(LEFT_BOUNDARY_Vel, 0, false)); // Left boundary
    //   for (let j = 1; j < this.cellCount.x; j++) {
    //     this.vectorsListHoriz[i].push(new Vector(0, 0)); // Internal cells
    //   }
    //   this.vectorsListHoriz[i].push(new Vector(0, 0)); // Right boundary
    // }

    // // Initialize vertical vectors
    // for (let i = 0; i <= this.cellCount.y; i++) { // Note: using <= to include an extra row at the bottom
    //   this.vectorsListVert.push([]);
    //   for (let j = 0; j < this.cellCount.x; j++) {
    //     if (i === 0 || i === this.cellCount.y+1) {
    //       this.vectorsListVert[i].push(new Vector(0, 0, false)); // Top and bottom boundaries
    //     } else {
    //       this.vectorsListVert[i].push(new Vector(0, 0)); // Internal cells
    //     }
    //   }
    // }

    // Create cells
    for (let i = 0; i < this.cellCount.y; i++) {
      this.cells.push([]);
      for (let j = 0; j < this.cellCount.x; j++) {
        const pos = new Vector(j * this.cellSize, i * this.cellSize);
        this.cells[i].push(
          new Cell(
            pos,
            this.cellSize,
            false,
            this.vectorsListHoriz[i][j], 
            this.vectorsListVert[i][j], 
            this.vectorsListHoriz[i][j + 1], 
            this.vectorsListVert[i + 1][j]  
          )
        );
      }
    }
  };

  findVelocityAtPoint = (point: Vector): Vector => {
    const x = Math.floor(point.x / this.cellSize);
    const y = Math.floor(point.y / this.cellSize);
    // console.log("X: ", x, "Y: ", y);

    if (x < 0) {
      // console.warn("Returning left boundary vel")
      return new Vector(LEFT_BOUNDARY_Vel, 0);
    }
    if (x >= this.cellCount.x || y < 0 || y >= this.cellCount.y) {
      // console.warn("Returning out of vertical boundry vel")
      return new Vector(0, 0);
    }
    const cell = this.cells[y][x];
    // console.log('Cell chosen has X: ', cell.pos.x, " and Y: ", cell.pos.y)
    // console.log("Point x: ", point.x, " , Y: ", point.y)

    // console.log(cell.pos.x)
    const dx = (point.x - cell.pos.x) / cell.size;
    const dy = (point.y - cell.pos.y) / cell.size;

    if (dx < 0 || dx > 1 || dy < 0 || dy > 1) {
      // console.table([dx, dy]);
      throw new Error(
        "Invalid point. Not inside cell boundary. Find velocity at point failed. No worries, easy fix"
      );
    }
    if (dx < 0.5) {
      if (dy < 0.5) {
        let leftUVel: Vector | undefined;
        let leftDVel: Vector | undefined;
        let upLVel: Vector | undefined;
        let upRVel: Vector | undefined;

        if (x == 0) {
          leftUVel = new Vector(0, 0);
          leftDVel = new Vector(0, 0);
          // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
        } else {
          leftUVel = this.cells[y][x - 1].vu;
          leftDVel = this.cells[y][x - 1].vd;
          // upLVel = this.cells[y-1][x].vl;
        }
        if (y == 0) {
          if (x == 0) {
            upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
          } else {
            upLVel = new Vector(0, 0);
          }
          // upLVel = new Vector(0, 0);
          upRVel = new Vector(0, 0);
        } else {
          upLVel = this.cells[y - 1][x].vl;
          upRVel = this.cells[y - 1][x].vr;
        }
        if (
          leftUVel === undefined ||
          leftDVel === undefined ||
          upLVel === undefined ||
          upRVel === undefined
        ) {
          throw new Error(
            "Undefined founf velocity in condition 1. Find velocity at point failed. You got this, champ"
          );
        }
        // console.table([leftUVel, leftDVel, upLVel, upRVel, cell.vl, cell.vr, cell.vu, cell.vd]);
        const xVelLeftYInterpolated =
          upLVel.x * (0.5 - dy) + cell.vl.x * (0.5 + dy);
        const xVelRightYInterpolated =
          upRVel.x * (0.5 - dy) + cell.vr.x * (0.5 + dy);
        const xVel =
          xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;

        const yVelUpXInterpolated =
          leftUVel.y * (0.5 - dx) + cell.vu.y * (0.5 + dx);
        const yVelDownXInterpolated =
          leftDVel.y * (0.5 - dx) + cell.vd.y * (0.5 + dx);
        const yVel =
          yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;
        // console.table([xVelLeftYInterpolated, xVelRightYInterpolated]);
        // console.table([yVelUpXInterpolated, yVelDownXInterpolated]);
        // console.table([xVel, yVel]);

        // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
        if (xVel === undefined || yVel === undefined) {
          if (xVel === undefined) {
            throw new Error(
              "Undefined xVel in condition 1. Find velocity at point failed. You got this, champ"
            );
          }
          if (yVel === undefined) {
            throw new Error(
              "Undefined yVel in condition 1. Find velocity at point failed. You got this, champ"
            );
          }
        }
        return new Vector(xVel, yVel);

        // return cell.vl;
      } else {
        let leftUVel: Vector | undefined;
        let leftDVel: Vector | undefined;
        let downLVel: Vector | undefined;
        let downRVel: Vector | undefined;

        if (x == 0) {
          leftUVel = new Vector(0, 0);
          leftDVel = new Vector(0, 0);
          // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
        } else {
          leftUVel = this.cells[y][x - 1].vu;
          leftDVel = this.cells[y][x - 1].vd;
          // upLVel = this.cells[y-1][x].vl;
        }
        if (y == this.cellCount.y - 1) {
          if (x == 0) {
            downLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
          } else {
            downLVel = new Vector(0, 0);
          }
          // downLVel = new Vector(0, 0);
          downRVel = new Vector(0, 0);
        } else {
          downLVel = this.cells[y + 1][x].vl;
          downRVel = this.cells[y + 1][x].vr;
        }
        if (
          leftUVel === undefined ||
          leftDVel === undefined ||
          downLVel === undefined ||
          downRVel === undefined
        ) {
          throw new Error(
            "Undefined found velocity in condition 2. Find velocity at point failed. You got this, champ"
          );
        }
        const xVelLeftYInterpolated =
          downLVel.x * (dy - 0.5) + cell.vl.x * (1 - (dy - 0.5));
        const xVelRightYInterpolated =
          downRVel.x * (dy - 0.5) + cell.vr.x * (1 - (dy - 0.5));
        const xVel =
          xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;

        const yVelUpXInterpolated =
          leftUVel.y * (0.5 - dx) + cell.vu.y * (0.5 + dx);
        const yVelDownXInterpolated =
          leftDVel.y * (0.5 - dx) + cell.vd.y * (0.5 + dx);
        const yVel =
          yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;

        // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
        if (xVel === undefined || yVel === undefined) {
          if (!xVel) {
            throw new Error(
              "Undefined xVel in condition 2. Find velocity at point failed. You got this, champ"
            );
          }
          if (!yVel) {
            throw new Error(
              "Undefined yVel in condition 2. Find velocity at point failed. You got this, champ"
            );
          }
        }
        return new Vector(xVel, yVel);
      }
    } else {
      if (dy < 0.5) {
        let rightUVel: Vector | undefined;
        let rightDVel: Vector | undefined;
        let upLVel: Vector | undefined;
        let upRVel: Vector | undefined;

        if (x == this.cellCount.x - 1) {
          rightUVel = this.cells[y][x].vu;
          rightDVel = this.cells[y][x].vd;
          // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
        } else {
          rightUVel = this.cells[y][x + 1].vu;
          rightDVel = this.cells[y][x + 1].vd;
          // upLVel = this.cells[y-1][x].vl;
        }
        if (y == 0) {
          upLVel = new Vector(0, 0);
          upRVel = new Vector(0, 0);
        } else {
          upLVel = this.cells[y - 1][x].vl;
          upRVel = this.cells[y - 1][x].vr;
        }
        if (
          rightUVel === undefined ||
          rightDVel === undefined ||
          upLVel === undefined ||
          upRVel === undefined
        ) {
          throw new Error(
            "Undefined found velocity in condition 3. Find velocity at point failed. You got this, champ"
          );
        }
        const xVelLeftYInterpolated =
          upLVel.x * (0.5 - dy) + cell.vl.x * (0.5 + dy);
        const xVelRightYInterpolated =
          upRVel.x * (0.5 - dy) + cell.vr.x * (0.5 + dy);
        const xVel =
          xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;

        const yVelUpXInterpolated =
          rightUVel.y * (dx - 0.5) + cell.vu.y * (1 - (dx - 0.5));
        const yVelDownXInterpolated =
          rightDVel.y * (dx - 0.5) + cell.vd.y * (1 - (dx - 0.5));
        const yVel =
          yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;

        // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
        if (xVel === undefined || yVel === undefined) {
          if (!xVel) {
            throw new Error(
              "Undefined xVel in condition 3. Find velocity at point failed. You got this, champ"
            );
          }
          if (yVel === undefined) {
            throw new Error(
              "Undefined yVel in condition 3. Find velocity at point failed. You got this, champ"
            );
          }
        }
        return new Vector(xVel, yVel);
      } else {
        // console.log("Corner")
        let rightUVel: Vector | undefined;
        let rightDVel: Vector | undefined;
        let downLVel: Vector | undefined;
        let downRVel: Vector | undefined;

        if (x >= this.cellCount.x - 1) {
          rightUVel = this.cells[y][x].vu;
          rightDVel = this.cells[y][x].vd;
          // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
        } else {
          rightUVel = this.cells[y][x + 1].vu;
          rightDVel = this.cells[y][x + 1].vd;
          // upLVel = this.cells[y-1][x].vl;
        }

        // console.log("Point 1")
        if (y == this.cellCount.y - 1) {
          // console.log("Y found")
          downLVel = new Vector(0, 0);
          downRVel = new Vector(0, 0);
        } else {
          // console.log('Y not found')
          downLVel = this.cells[y + 1][x].vl;
          downRVel = this.cells[y + 1][x].vr;
        }
        if (
          rightUVel === undefined ||
          rightDVel === undefined ||
          downLVel === undefined ||
          downRVel === undefined
        ) {
          throw new Error(
            "Undefined found velocity in condition 4. Find velocity at point failed. You got this, champ"
          );
        }
        // console.log("Point 2")
        const xVelLeftYInterpolated =
          downLVel.x * (0.5 - dy) + cell.vl.x * (1 - (0.5 - dy));
        const xVelRightYInterpolated =
          downRVel.x * (0.5 - dy) + cell.vr.x * (1 - (0.5 - dy));
        const xVel =
          xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;

        const yVelUpXInterpolated =
          rightUVel.y * (dx - 0.5) + cell.vu.y * (1 - (dx - 0.5));
        const yVelDownXInterpolated =
          rightDVel.y * (dx - 0.5) + cell.vd.y * (1 - (dx - 0.5));
        const yVel =
          yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;

        // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
        if (xVel === undefined || yVel === undefined) {
          if (!xVel) {
            throw new Error(
              "Undefined xVel in condition 4. Find velocity at point failed. You got this, champ"
            );
          }
          if (!yVel) {
            throw new Error(
              "Undefined yVel in condition 4. Find velocity at point failed. You got this, champ"
            );
          }
        }
        // console.log(xVel, yVel)
        return new Vector(xVel, yVel);
      }
    }
  };

  advectCellVelocities = (cell: Cell, dt: number): void => {
    const l1x = cell.pos.x;
    const l1y = cell.pos.y + cell.size / 2;
    const u1x = cell.pos.x + cell.size / 2;
    const u1y = cell.pos.y;
    const r1x = cell.pos.x + cell.size;
    const r1y = cell.pos.y + cell.size / 2;
    const d1x = cell.pos.x + cell.size / 2;
    const d1y = cell.pos.y + cell.size;

    const fullVL1 = this.findVelocityAtPoint(new Vector(l1x, l1y));
    const fullVU1 = this.findVelocityAtPoint(new Vector(u1x, u1y));
    const fullVR1 = this.findVelocityAtPoint(new Vector(r1x, r1y));
    const fullVD1 = this.findVelocityAtPoint(new Vector(d1x, d1y));

    const VLdx1 = (-fullVL1.x * dt) / 2;
    const VLdy1 = (-fullVL1.y * dt) / 2;
    const VUdx1 = (-fullVU1.x * dt) / 2;
    const VUdy1 = (-fullVU1.y * dt) / 2;
    const VRdx1 = (-fullVR1.x * dt) / 2;
    const VRdy1 = (-fullVR1.y * dt) / 2;
    const VDdx1 = (-fullVD1.x * dt) / 2;
    const VDdy1 = (-fullVD1.y * dt) / 2;

    const l2x = l1x + VLdx1;
    const l2y = l1y + VLdy1;
    const u2x = u1x + VUdx1;
    const u2y = u1y + VUdy1;
    const r2x = r1x + VRdx1;
    const r2y = r1y + VRdy1;
    const d2x = d1x + VDdx1;
    const d2y = d1y + VDdy1;

    // console.table([
    //   [l2x, l2y],
    //   [u2x, u2y],
    //   [r2x, r2y],
    //   [d2x, d2y],
    // ]);

    // console.log(
    //   "Deltas: ",
    //   VLdx1,
    //   VLdy1,
    //   VUdx1,
    //   VUdy1,
    //   VRdx1,
    //   VRdy1,
    //   VDdx1,
    //   VDdy1
    // );
    // console.log(
    //   "velocity found: ",
    //   this.findVelocityAtPoint(new Vector(l2x, l2y))
    // );
    cell.vl.cacheVec(this.findVelocityAtPoint(new Vector(l2x, l2y)));
    cell.vu.cacheVec(this.findVelocityAtPoint(new Vector(u2x, u2y)));
    cell.vr.cacheVec(this.findVelocityAtPoint(new Vector(r2x, r2y)));
    cell.vd.cacheVec(this.findVelocityAtPoint(new Vector(d2x, d2y)));
  };

  advectVelocities = (dt: number): void => {
    for (let i = 0; i < this.cellCount.x; i++) {
      for (let j = 0; j < this.cellCount.y; j++) {
        this.advectCellVelocities(this.cells[j][i], dt);
      }
    }
  };

  applyCellVelocities = (): void => {
    for (let i = 0; i < this.cellCount.x; i++) {
      for (let j = 0; j < this.cellCount.y; j++) {
        const cell = this.cells[j][i];
        cell.vl.applyCache();
        cell.vu.applyCache();
        cell.vr.applyCache();
        cell.vd.applyCache();
        cell.vectors = [cell.vl, cell.vu, cell.vr, cell.vd];
      }
    }
  };
  ensureBoundaryConditions = (): void => {
    for (let i = 0; i < this.cellCount.y; i++) {
      this.cells[i][0].vl.update(LEFT_BOUNDARY_Vel, 0, true);
    }
    for (let j = 0; j < this.cellCount.x; j++) {
      this.cells[0][j].vu.update(0, 0, true);
      this.cells[this.cellCount.y - 1][j].vd.update(0, 0, true);
    }
  };
  eliminateDivergence = (iterations: number = 100): void => {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < this.cellCount.x; i++) {
        for (let j = 0; j < this.cellCount.y; j++) {
          // console.log(this.cellCount)
          this.cells[j][i].makeDivergenceZero();
        }
      }
      // for (let a = 0; a < this.cellCount.x; a++) {
      //   for (let b = 0; b < this.cellCount.y; b++) {
      //     this.cells[b][a].applyVectorCache();
      //   }
      // }

      // this.ensureBoundaryConditions();
    }
  };
  performIteration = (mu: number = 1000, dx: number, dt: number): void => {
    // this.eliminateDivergence(1);
    this.eliminateDivergence((mu * dt) / (dx * dx));
    this.advectVelocities(dt);
    this.applyCellVelocities();
  };
  
  drawFluid = (ctx: CanvasRenderingContext2D, scalingFactor: number): void => {
    for (let i = 0; i < this.cellCount.x; i++) {
      for (let j = 0; j < this.cellCount.y; j++) {
        const cell = this.cells[j][i];
        ctx.beginPath();
        // ctx.moveTo(cell.pos.x, cell.pos.y);
        ctx.rect(cell.pos.x*scalingFactor, cell.pos.y*scalingFactor, cell.size*scalingFactor, cell.size*scalingFactor);
        const divergenceToUse = normaliseDivergenceToColour(cell.findDivergence(), 10);
        ctx.fillStyle = `rgb(${Math.abs(divergenceToUse) * 255}, 0, ${(1-Math.abs(divergenceToUse)) * 255})`;
        if(cell.isWall){
          ctx.fillStyle = 'black';
        }

        ctx.fill();
        // ctx.beginPath();
        // ctx.moveTo(cell.pos.x, cell.pos.y);
        // ctx.lineTo(cell.pos.x + cell.size, cell.pos.y);
        // ctx.lineTo(cell.pos.x + cell.size, cell.pos.y + cell.size);
        // ctx.lineTo(cell.pos.x, cell.pos.y + cell.size);
        // ctx.lineTo(cell.pos.x, cell.pos.y);
        // ctx.stroke();
      }
    }
  }


  makeWall = (x: number, y: number, rx1: number, ry1: number) => {
    for (let i = x; i < rx1; i++) {
      for (let j = y; j < ry1; j++) {
        this.cells[j][i].isWall = true;
        this.cells[j][i].vl.update(0, 0, true);
        this.cells[j][i].vu.update(0, 0, true);
        this.cells[j][i].vr.update(0, 0, true);
        this.cells[j][i].vd.update(0, 0, true);
        this.cells[j][i].vl.setMutability(false);
        this.cells[j][i].vu.setMutability(false);
        this.cells[j][i].vr.setMutability(false);
        this.cells[j][i].vd.setMutability(false);
      }
    }
  }
}

let myFluid: Fluid = new Fluid(50, 50, CELL_SIZE);
myFluid.makeWall(20, 20, 30, 30);

// console.log(myFluid.cellCount);
const xVal = 0.2;
const yVal = 0.7;
// console.table(myFluid.cells[1][0].vectors);


myFluid.drawFluid(ctx, 5);


const mainFunction = () => {
  myFluid.performIteration(1000, 1, 0.01);
  myFluid.drawFluid(ctx, DRAW_SCALE);
  console.log("Iteration done");
}

setInterval(mainFunction, 1000/60);



const findInfo = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  console.log("X: ", x, "Y: ", y);
  const vel = myFluid.findVelocityAtPoint(new Vector(x/DRAW_SCALE, y/DRAW_SCALE));

  console.log("Velocity-> X: ", vel.x, "Y: ", vel.y);
} 

canvas.addEventListener('mousemove', findInfo);
// for (let i = 0; i < 100; i++) {
//   myFluid.performIteration(1000, 1, 0.01);
// }
// // myFluid.cells[1][0].makeDivergenceZero();

// myFluid.performIteration(1000, 1, 0.01);

// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[1][0].vectors);
// console.table(myFluid.cells[0][1].vectors);

// console.table(myFluid.cells[1][1].vectors);
// myFluid.performIteration(1000, 1, 0.1);

// console.log("VertVecs: ", myFluid.vectorsListVert.length);
// console.log("HorizVecs: ", myFluid.vectorsListHoriz[0].length);

// console.table(myFluid.cells[0][0].vectors);

// myFluid.cells[2][2].makeDivergenceZero();

// console.table(myFluid.cells[2][2].vectors)
// myFluid.cells[2][2].applyVectorCache();
// myFluid.cells[2][2].makeDivergenceZero();
// console.table(myFluid.cells[2][2].vectors)

// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[1][0].vectors);
// console.table(myFluid.cells[0][1].vectors);

// console.table(myFluid.cells[1][1].vectors);
// myFluid.performIteration(1000, 1, 0.1);

// console.table(myFluid.cells[1][1].vectors);
// myFluid.performIteration(1000, 1, 0.1);

/*
Things to do before starting next time:
// Verify that the immutable vector creation in createCells function is correct.
// Verify that vector functions comply with immuatble arguements
// Test divergence function
Handle ensureBoundryConditions function


*/

// myFluid.cells[1][0].vl.update(2, 2, true);
// myFluid.cells[1][0].vr.update(-1, 2, true);
// myFluid.cells[1][0].vu.update(2, 4, true);
// myFluid.cells[1][0].vd.update(2, 0, true);

// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[1][0].vectors);
// console.log("Divergence: ", myFluid.cells[1][0].findDivergence());
// myFluid.cells[1][0].makeDivergenceZero();
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[1][0].vectors);
// console.log("Divergence: ", myFluid.cells[1][0].findDivergence());
// myFluid.cells[1][0].makeDivergenceZero();
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[1][0].vectors);
// console.log("Divergence: ", myFluid.cells[1][0].findDivergence());
// myFluid.cells[1][0].makeDivergenceZero();
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[1][0].vectors);
// console.log("Divergence: ", myFluid.cells[1][0].findDivergence());

// myFluid.applyCellVelocities();
// console.log("Before advection: ", myFluid.findVelocityAtPoint(new Vector(xVal, yVal)).x);
// console.table(myFluid.cells[0][0].vectors)
// myFluid.advectVelocities(0.8);
// // myFluid.advectCellVelocities(myFluid.cells[0][0], 0.8);
// console.table(myFluid.cells[0][0].vectors)
// myFluid.applyCellVelocities();
// console.table(myFluid.cells[0][0].vectors)
// console.log("After advection: ", myFluid.findVelocityAtPoint(new Vector(xVal, yVal)).x);

// console.log(myFluid.findVelocityAtPoint(new Vector(2.9, 0.1)).x);

// Testing pass by reference
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[0][1].vectors);
// console.log("One done")
// myFluid.cells[0][0].vectors[0].update(100, 100, true);
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[0][1].vectors);
// console.log("Two done")
// myFluid.cells[0][0].vectors[2].update(150, 160, true);
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[0][1].vectors);
// console.log("Three done")
// myFluid.cells[0][0].vectors[2].cacheVec(new Vector(200, 200));
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[0][1].vectors);
// console.log("Four done")
// myFluid.cells[0][0].vectors[2].applyCache();
// console.table(myFluid.cells[0][0].vectors);
// console.table(myFluid.cells[0][1].vectors);
