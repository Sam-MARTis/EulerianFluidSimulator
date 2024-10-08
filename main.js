"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
if (ctx === null) {
    throw new Error("Context is null");
}
//Constants
const LEFT_BOUNDARY_Vel = 5;
const CELL_COUNT_X = 100;
const CELL_COUNT_Y = 100;
const CELL_SIZE = 0.5;
const DRAW_SCALE = 5;
const PARTICLE_RADIUS = 0.07;
const MAX_PARTICLES = 1000000;
const PARTICLE_FREQUENCY_MULTIPLIER = 100;
const PRESSURE_SCALE = 0.4;
//Decrease to make blue
const FRACTION_OF_INPUT_TO_DRAW = 0.8;
const OVER_RELAXATION = 1.85;
const MU = 50;
const TIME_STEP = 0.05;
const SPEED_MULTIPLIER = 1;
const DRAW_INTERVAL = 1;
const CALCULATE_TO_DRAW_RATIO = 1;
//End constants
console.clear();
class Vector {
    constructor(x, y, isMutable = true) {
        this.isMutable = true;
        this.update = (x, y, override = false) => {
            if (this.isMutable || override) {
                this.x = x;
                this.y = y;
                this.x_stored = x;
                this.y_stored = y;
            }
        };
        this.setMutability = (isMutable) => {
            this.isMutable = isMutable;
        };
        this.increment = (x, y, override = false) => {
            if (this.isMutable || override) {
                this.x += x;
                this.y += y;
                this.x_stored = this.x;
                this.y_stored = this.y;
            }
        };
        this.cache = (x, y, override = false) => {
            if (this.isMutable || override) {
                this.x_stored = x;
                this.y_stored = y;
            }
        };
        this.cacheVec = (vec, override = false) => {
            if (this.isMutable || override) {
                this.x_stored = vec.x;
                this.y_stored = vec.y;
            }
        };
        this.addToCache = (x, y, override = false) => {
            if (this.isMutable || override) {
                this.x_stored += x;
                this.y_stored += y;
            }
        };
        this.addToCacheVec = (vec, override = false) => {
            if (this.isMutable || override) {
                this.x_stored += vec.x;
                this.y_stored += vec.y;
            }
            // this.x_stored += vec.x;
            // this.y_stored += vec.y;
        };
        this.applyCache = (override = false) => {
            if (this.isMutable || override) {
                this.x = this.x_stored;
                this.y = this.y_stored;
            }
            // this.x = this.x_stored;
            // this.y = this.y_stored;
        };
        this.x = x;
        this.y = y;
        this.x_stored = x;
        this.y_stored = y;
        this.isMutable = isMutable;
    }
}
const normaliseValueToColour = (divergence, normalizationFactor) => {
    // return Math.exp(-((divergence/normalizationFactor)**2));
    return 0.5 + Math.tanh(divergence / normalizationFactor) / Math.PI;
};
const normaliseValueToColour2 = (value, normalizationFactor) => {
    return Math.sign(value - 0.5) * (Math.abs(value - 0.5) ** (1 / normalizationFactor));
};
class FluidPoint {
    constructor(pos, vel, rad) {
        this.isAlive = true;
        this.setVelocity = (vel) => {
            this.vel = vel;
        };
        this.applyVelocity = (dt) => {
            this.pos.increment(this.vel.x * dt, this.vel.y * dt);
        };
        this.drawParticle = (ctx, scalingFactor) => {
            ctx.beginPath();
            ctx.arc(this.pos.x * scalingFactor, this.pos.y * scalingFactor, this.radius * scalingFactor, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        };
        this.pos = pos;
        this.vel = vel;
        this.radius = rad;
    }
}
class Cell {
    constructor(pos, size, isWall, vl, vu, vr, vd) {
        this.isTracerFluid = false;
        this.vectors = [];
        this.pressure = 0;
        this.findDivergence = () => {
            return this.vl.x - this.vr.x + this.vu.y - this.vd.y;
        };
        this.makeDivergenceZero = () => {
            // try{
            const divergence = this.findDivergence();
            this.pressure += divergence;
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
            this.vl.increment(-OVER_RELAXATION * divergencePerVector, 0);
            this.vr.increment(OVER_RELAXATION * divergencePerVector, 0);
            this.vu.increment(0, -OVER_RELAXATION * divergencePerVector);
            this.vd.increment(0, OVER_RELAXATION * divergencePerVector);
            // this.vl.x -= (OVER_RELAXATION) * divergencePerVector;
            // this.vr.x += (OVER_RELAXATION) * divergencePerVector;
            // this.vu.y -= (OVER_RELAXATION) * divergencePerVector;
            // this.vd.y += (OVER_RELAXATION) * divergencePerVector;
        };
        this.applyVectorCache = () => {
            this.vl.applyCache();
            this.vu.applyCache();
            this.vr.applyCache();
            this.vd.applyCache();
        };
        this.pos = pos;
        this.size = size;
        this.isWall = isWall;
        this.vl = vl;
        this.vu = vu;
        this.vr = vr;
        this.vd = vd;
        this.vectors = [this.vl, this.vu, this.vr, this.vd];
    }
}
class Fluid {
    constructor(x_dim, y_dim, cellSize, ctx) {
        this.cells = [];
        this.vectorsListVert = [];
        this.vectorsListHoriz = [];
        this.identifierParticles = [];
        this.timeSinceLastParticle = 0;
        this.wallRanges = [];
        this.iterationCount = 0;
        this.createCells = () => {
            // Initialize horizontal vectors
            this.vectorsListHoriz = [];
            this.vectorsListVert = [];
            for (let i = 0; i < this.cellCount.y; i++) {
                this.vectorsListHoriz.push([]);
                for (let j = 0; j < this.cellCount.x + 1; j++) {
                    this.vectorsListHoriz[i].push(new Vector(LEFT_BOUNDARY_Vel, 0));
                }
            }
            for (let i = 0; i < this.cellCount.y + 1; i++) {
                this.vectorsListVert.push([]);
                for (let j = 0; j < this.cellCount.x; j++) {
                    this.vectorsListVert[i].push(new Vector(0, 0));
                }
            }
            for (let i = 0; i < this.cellCount.y; i++) {
                this.vectorsListHoriz[i][0] = new Vector(LEFT_BOUNDARY_Vel, 0, false);
            }
            for (let i = 0; i < this.cellCount.x; i++) {
                this.vectorsListVert[0][i] = new Vector(0, 0, false);
                this.vectorsListVert[this.vectorsListVert.length - 1][i] = new Vector(0, 0, false);
            }
            // Create cells
            for (let i = 0; i < this.cellCount.y; i++) {
                this.cells.push([]);
                for (let j = 0; j < this.cellCount.x; j++) {
                    const pos = new Vector(j * this.cellSize, i * this.cellSize);
                    this.cells[i].push(new Cell(pos, this.cellSize, false, this.vectorsListHoriz[i][j], this.vectorsListVert[i][j], this.vectorsListHoriz[i][j + 1], this.vectorsListVert[i + 1][j]));
                }
            }
        };
        this.findVelocityAtPoint = (point) => {
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
                throw new Error("Invalid point. Not inside cell boundary. Find velocity at point failed. No worries, easy fix");
            }
            if (dx < 0.5) {
                if (dy < 0.5) {
                    let leftUVel;
                    let leftDVel;
                    let upLVel;
                    let upRVel;
                    if (x == 0) {
                        leftUVel = new Vector(0, 0);
                        leftDVel = new Vector(0, 0);
                        // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                    }
                    else {
                        leftUVel = this.cells[y][x - 1].vu;
                        leftDVel = this.cells[y][x - 1].vd;
                        // upLVel = this.cells[y-1][x].vl;
                    }
                    if (y == 0) {
                        if (x == 0) {
                            upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                        }
                        else {
                            upLVel = new Vector(0, 0);
                        }
                        // upLVel = new Vector(0, 0);
                        upRVel = new Vector(0, 0);
                    }
                    else {
                        upLVel = this.cells[y - 1][x].vl;
                        upRVel = this.cells[y - 1][x].vr;
                    }
                    if (leftUVel === undefined ||
                        leftDVel === undefined ||
                        upLVel === undefined ||
                        upRVel === undefined) {
                        throw new Error("Undefined founf velocity in condition 1. Find velocity at point failed. You got this, champ");
                    }
                    // console.table([leftUVel, leftDVel, upLVel, upRVel, cell.vl, cell.vr, cell.vu, cell.vd]);
                    const xVelLeftYInterpolated = upLVel.x * (0.5 - dy) + cell.vl.x * (0.5 + dy);
                    const xVelRightYInterpolated = upRVel.x * (0.5 - dy) + cell.vr.x * (0.5 + dy);
                    const xVel = xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;
                    const yVelUpXInterpolated = leftUVel.y * (0.5 - dx) + cell.vu.y * (0.5 + dx);
                    const yVelDownXInterpolated = leftDVel.y * (0.5 - dx) + cell.vd.y * (0.5 + dx);
                    const yVel = yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;
                    // console.table([xVelLeftYInterpolated, xVelRightYInterpolated]);
                    // console.table([yVelUpXInterpolated, yVelDownXInterpolated]);
                    // console.table([xVel, yVel]);
                    // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
                    if (xVel === undefined || yVel === undefined) {
                        if (xVel === undefined) {
                            throw new Error("Undefined xVel in condition 1. Find velocity at point failed. You got this, champ");
                        }
                        if (yVel === undefined) {
                            throw new Error("Undefined yVel in condition 1. Find velocity at point failed. You got this, champ");
                        }
                    }
                    return new Vector(xVel, yVel);
                    // return cell.vl;
                }
                else {
                    let leftUVel;
                    let leftDVel;
                    let downLVel;
                    let downRVel;
                    if (x == 0) {
                        leftUVel = new Vector(0, 0);
                        leftDVel = new Vector(0, 0);
                        // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                    }
                    else {
                        leftUVel = this.cells[y][x - 1].vu;
                        leftDVel = this.cells[y][x - 1].vd;
                        // upLVel = this.cells[y-1][x].vl;
                    }
                    if (y == this.cellCount.y - 1) {
                        if (x == 0) {
                            downLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                        }
                        else {
                            downLVel = new Vector(0, 0);
                        }
                        // downLVel = new Vector(0, 0);
                        downRVel = new Vector(0, 0);
                    }
                    else {
                        downLVel = this.cells[y + 1][x].vl;
                        downRVel = this.cells[y + 1][x].vr;
                    }
                    if (leftUVel === undefined ||
                        leftDVel === undefined ||
                        downLVel === undefined ||
                        downRVel === undefined) {
                        throw new Error("Undefined found velocity in condition 2. Find velocity at point failed. You got this, champ");
                    }
                    const xVelLeftYInterpolated = downLVel.x * (dy - 0.5) + cell.vl.x * (1 - (dy - 0.5));
                    const xVelRightYInterpolated = downRVel.x * (dy - 0.5) + cell.vr.x * (1 - (dy - 0.5));
                    const xVel = xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;
                    const yVelUpXInterpolated = leftUVel.y * (0.5 - dx) + cell.vu.y * (0.5 + dx);
                    const yVelDownXInterpolated = leftDVel.y * (0.5 - dx) + cell.vd.y * (0.5 + dx);
                    const yVel = yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;
                    // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
                    if (xVel === undefined || yVel === undefined) {
                        if (!xVel) {
                            throw new Error("Undefined xVel in condition 2. Find velocity at point failed. You got this, champ");
                        }
                        if (!yVel) {
                            throw new Error("Undefined yVel in condition 2. Find velocity at point failed. You got this, champ");
                        }
                    }
                    return new Vector(xVel, yVel);
                }
            }
            else {
                if (dy < 0.5) {
                    let rightUVel;
                    let rightDVel;
                    let upLVel;
                    let upRVel;
                    if (x == this.cellCount.x - 1) {
                        rightUVel = this.cells[y][x].vu;
                        rightDVel = this.cells[y][x].vd;
                        // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                    }
                    else {
                        rightUVel = this.cells[y][x + 1].vu;
                        rightDVel = this.cells[y][x + 1].vd;
                        // upLVel = this.cells[y-1][x].vl;
                    }
                    if (y == 0) {
                        upLVel = new Vector(0, 0);
                        upRVel = new Vector(0, 0);
                    }
                    else {
                        upLVel = this.cells[y - 1][x].vl;
                        upRVel = this.cells[y - 1][x].vr;
                    }
                    if (rightUVel === undefined ||
                        rightDVel === undefined ||
                        upLVel === undefined ||
                        upRVel === undefined) {
                        throw new Error("Undefined found velocity in condition 3. Find velocity at point failed. You got this, champ");
                    }
                    const xVelLeftYInterpolated = upLVel.x * (0.5 - dy) + cell.vl.x * (0.5 + dy);
                    const xVelRightYInterpolated = upRVel.x * (0.5 - dy) + cell.vr.x * (0.5 + dy);
                    const xVel = xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;
                    const yVelUpXInterpolated = rightUVel.y * (dx - 0.5) + cell.vu.y * (1 - (dx - 0.5));
                    const yVelDownXInterpolated = rightDVel.y * (dx - 0.5) + cell.vd.y * (1 - (dx - 0.5));
                    const yVel = yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;
                    // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
                    if (xVel === undefined || yVel === undefined) {
                        if (!xVel) {
                            throw new Error("Undefined xVel in condition 3. Find velocity at point failed. You got this, champ");
                        }
                        if (yVel === undefined) {
                            throw new Error("Undefined yVel in condition 3. Find velocity at point failed. You got this, champ");
                        }
                    }
                    return new Vector(xVel, yVel);
                }
                else {
                    // console.log("Corner")
                    let rightUVel;
                    let rightDVel;
                    let downLVel;
                    let downRVel;
                    if (x >= this.cellCount.x - 1) {
                        rightUVel = this.cells[y][x].vu;
                        rightDVel = this.cells[y][x].vd;
                        // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                    }
                    else {
                        rightUVel = this.cells[y][x + 1].vu;
                        rightDVel = this.cells[y][x + 1].vd;
                        // upLVel = this.cells[y-1][x].vl;
                    }
                    // console.log("Point 1")
                    if (y == this.cellCount.y - 1) {
                        // console.log("Y found")
                        downLVel = new Vector(0, 0);
                        downRVel = new Vector(0, 0);
                    }
                    else {
                        // console.log('Y not found')
                        downLVel = this.cells[y + 1][x].vl;
                        downRVel = this.cells[y + 1][x].vr;
                    }
                    if (rightUVel === undefined ||
                        rightDVel === undefined ||
                        downLVel === undefined ||
                        downRVel === undefined) {
                        throw new Error("Undefined found velocity in condition 4. Find velocity at point failed. You got this, champ");
                    }
                    // console.log("Point 2")
                    const xVelLeftYInterpolated = downLVel.x * (0.5 - dy) + cell.vl.x * (1 - (0.5 - dy));
                    const xVelRightYInterpolated = downRVel.x * (0.5 - dy) + cell.vr.x * (1 - (0.5 - dy));
                    const xVel = xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx;
                    const yVelUpXInterpolated = rightUVel.y * (dx - 0.5) + cell.vu.y * (1 - (dx - 0.5));
                    const yVelDownXInterpolated = rightDVel.y * (dx - 0.5) + cell.vd.y * (1 - (dx - 0.5));
                    const yVel = yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy;
                    // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
                    if (xVel === undefined || yVel === undefined) {
                        if (!xVel) {
                            throw new Error("Undefined xVel in condition 4. Find velocity at point failed. You got this, champ");
                        }
                        if (!yVel) {
                            throw new Error("Undefined yVel in condition 4. Find velocity at point failed. You got this, champ");
                        }
                    }
                    // console.log(xVel, yVel)
                    return new Vector(xVel, yVel);
                }
            }
        };
        this.advectCellVelocities = (cell, dt) => {
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
            const fullVL2 = this.findVelocityAtPoint(new Vector(l2x, l2y));
            const fullVU2 = this.findVelocityAtPoint(new Vector(u2x, u2y));
            const fullVR2 = this.findVelocityAtPoint(new Vector(r2x, r2y));
            const fullVD2 = this.findVelocityAtPoint(new Vector(d2x, d2y));
            const VLdx2 = (-fullVL2.x * dt);
            const VLdy2 = (-fullVL2.y * dt);
            const VUdx2 = (-fullVU2.x * dt);
            const VUdy2 = (-fullVU2.y * dt);
            const VRdx2 = (-fullVR2.x * dt);
            const VRdy2 = (-fullVR2.y * dt);
            const VDdx2 = (-fullVD2.x * dt);
            const VDdy2 = (-fullVD2.y * dt);
            const l3x = l1x + VLdx2;
            const l3y = l1y + VLdy2;
            const u3x = u1x + VUdx2;
            const u3y = u1y + VUdy2;
            const r3x = r1x + VRdx2;
            const r3y = r1y + VRdy2;
            const d3x = d1x + VDdx2;
            const d3y = d1y + VDdy2;
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
            cell.vl.cacheVec(this.findVelocityAtPoint(new Vector(l3x, l3y)));
            cell.vu.cacheVec(this.findVelocityAtPoint(new Vector(u3x, u3y)));
            cell.vr.cacheVec(this.findVelocityAtPoint(new Vector(r3x, r3y)));
            cell.vd.cacheVec(this.findVelocityAtPoint(new Vector(d3x, d3y)));
        };
        this.advectVelocities = (dt) => {
            for (let i = 0; i < this.cellCount.x; i++) {
                for (let j = 0; j < this.cellCount.y; j++) {
                    this.advectCellVelocities(this.cells[j][i], dt);
                }
            }
        };
        this.applyCellVelocities = () => {
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
        this.ensureBoundaryConditions = () => {
            for (let i = 0; i < this.cellCount.y; i++) {
                this.cells[i][0].vl.update(LEFT_BOUNDARY_Vel, 0, true);
            }
            for (let j = 0; j < this.cellCount.x; j++) {
                this.cells[0][j].vu.update(0, 0, true);
                this.cells[this.cellCount.y - 1][j].vd.update(0, 0, true);
            }
        };
        this.eliminateDivergence = (iterations = 100) => {
            for (let k = 0; k < iterations; k++) {
                for (let i = 0; i < this.cellCount.x; i++) {
                    for (let j = 0; j < this.cellCount.y; j++) {
                        // console.log(this.cellCount)
                        this.cells[j][i].makeDivergenceZero();
                    }
                }
            }
        };
        this.resetPressure = () => {
            for (let i = 0; i < this.cellCount.x; i++) {
                for (let j = 0; j < this.cellCount.y; j++) {
                    this.cells[j][i].pressure = 0;
                }
            }
        };
        this.performIteration = (mu = 100, dx, dt) => {
            // this.eliminateDivergence(1);
            this.eliminateDivergence((mu * dt) / (dx * dx));
            this.advectVelocities(dt);
            this.applyCellVelocities();
        };
        this.drawFluid = (ctx, scalingFactor) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < this.cellCount.x; i++) {
                for (let j = 0; j < this.cellCount.y; j++) {
                    const cell = this.cells[j][i];
                    ctx.beginPath();
                    // ctx.moveTo(cell.pos.x, cell.pos.y);
                    ctx.rect(cell.pos.x * scalingFactor, cell.pos.y * scalingFactor, cell.size * scalingFactor, cell.size * scalingFactor);
                    // const valueToUseToColour = normaliseValueToColour(
                    //   cell.pressure,
                    //   1
                    // );
                    let valueToUseToColour = 1 - cell.pressure / PRESSURE_SCALE;
                    if (valueToUseToColour < 0) {
                        valueToUseToColour = 0;
                    }
                    if (valueToUseToColour > 1) {
                        valueToUseToColour = 1;
                    }
                    // const valueToUseToColour = 0
                    // this.resetPressure();
                    ctx.fillStyle = `rgb(${Math.abs(valueToUseToColour) * 255}, 0, ${(1 - Math.abs(valueToUseToColour)) * 255})`;
                    if (cell.isWall) {
                        ctx.fillStyle = "black";
                    }
                    // else{
                    //   if(cell.isTracerFluid){
                    //     ctx.fillStyle = "red";
                    //   }
                    // }
                    // cell.isTracerFluid = false;
                    ctx.fill();
                }
            }
        };
        this.makeWall = (x_n, y_n, rx1_n, ry1_n) => {
            const x = Math.floor(this.cellCount.x * x_n);
            const y = Math.floor(this.cellCount.y * y_n);
            const rx1 = this.cellCount.x * rx1_n;
            const ry1 = this.cellCount.y * ry1_n;
            this.wallRanges.push([x * CELL_SIZE, y * CELL_SIZE, rx1 * CELL_SIZE, ry1 * CELL_SIZE]);
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
        };
        this.moveParticles = (dt) => {
            for (let i = 0; i < this.identifierParticles.length; i++) {
                const point = this.identifierParticles[i];
                const vel = this.findVelocityAtPoint(point.pos);
                const pos = new Vector(point.pos.x, point.pos.y);
                pos.x += vel.x * dt / 2;
                pos.y += vel.y * dt / 2;
                const velMid = this.findVelocityAtPoint(pos);
                point.setVelocity(velMid);
                // point.setVelocity(vel);
                point.applyVelocity(dt);
                this.cells[Math.floor(point.pos.y / CELL_SIZE)][Math.floor(point.pos.x / CELL_SIZE)].isTracerFluid = true;
            }
        };
        this.validateParticles = () => {
            for (let i = 0; i < this.identifierParticles.length; i++) {
                const point = this.identifierParticles[i];
                if (point.pos.x < 0 ||
                    point.pos.x > (this.dimensions.x * 0.99) ||
                    point.pos.y < 0 ||
                    point.pos.y > (this.dimensions.y)) {
                    point.isAlive = false;
                }
                for (let j = 0; j < this.wallRanges.length; j++) {
                    const wall = this.wallRanges[j];
                    if (point.pos.x > wall[0] &&
                        point.pos.x < wall[2] &&
                        point.pos.y > wall[1] &&
                        point.pos.y < wall[3]) {
                        point.isAlive = false;
                    }
                }
            }
        };
        this.handleParticleCreation = (maxParticles, frequencyMultiplier, radius) => {
            this.identifierParticles = this.identifierParticles.filter((point) => {
                return point.isAlive;
            });
            for (let _ = 0; _ < frequencyMultiplier; _++) {
                if (this.identifierParticles.length < maxParticles) {
                    // this.timeSinceLastParticle += dt;
                    // if(this.timeSinceLastParticle > 0.1){
                    //   this.timeSinceLastParticle = 0;
                    const x = Math.random() * (this.dimensions.x * 0.01);
                    const y = this.dimensions.y * (0.5 - FRACTION_OF_INPUT_TO_DRAW / 2) + Math.random() * (this.dimensions.y * FRACTION_OF_INPUT_TO_DRAW);
                    this.identifierParticles.push(new FluidPoint(new Vector(x, y), new Vector(0, 0), radius));
                }
            }
        };
        this.drawTracerParticles = (scalingFactor) => {
            for (let i = 0; i < this.identifierParticles.length; i++) {
                const point = this.identifierParticles[i];
                point.drawParticle(this.ctx, scalingFactor);
            }
        };
        // Call a function every interval that first validates particle, then moves and then creates new particles
        this.mainDrawFunction = (speedUp, dt = TIME_STEP, mu = 100) => {
            for (let i = 0; i < speedUp; i++) {
                this.resetPressure();
                this.performIteration(MU, CELL_SIZE, dt);
                this.moveParticles(dt);
                this.iterationCount++;
            }
            // const t1 = performance.now();
            this.validateParticles();
            // console.log(performance.now() - t1);
            this.handleParticleCreation(MAX_PARTICLES, PARTICLE_FREQUENCY_MULTIPLIER, PARTICLE_RADIUS);
            if (this.iterationCount % CALCULATE_TO_DRAW_RATIO == 0) {
                this.drawFluid(this.ctx, DRAW_SCALE);
                this.drawTracerParticles(DRAW_SCALE);
                // this.resetPressure();
            }
            // console.log("Iteration done");
        };
        this.dimensions = new Vector(x_dim, y_dim);
        this.cellSize = cellSize;
        this.ctx = ctx;
        this.cellCount = new Vector(Math.floor(x_dim / cellSize), Math.floor(y_dim / cellSize));
        this.createCells();
    }
}
let myFluid = new Fluid(CELL_COUNT_X, CELL_COUNT_Y, CELL_SIZE, ctx);
myFluid.makeWall(0.3, 0.4, 0.4, 0.6);
myFluid.makeWall(0.45, 0.55, 0.5, 0.7);
// console.log(myFluid.cellCount);
const xVal = 0.2;
const yVal = 0.7;
// console.table(myFluid.cells[1][0].vectors);
myFluid.drawFluid(ctx, 5);
let timeVal;
const mainFunction = () => {
    // myFluid.performIteration(1000, 1, 0.01);
    // myFluid.drawFluid(ctx, DRAW_SCALE);
    // const time2 = performance.now();
    myFluid.mainDrawFunction(SPEED_MULTIPLIER, TIME_STEP);
    // console.log("Iteration done");
    // console.log(myFluid.identifierParticles.length);
    // requestAnimationFrame(mainFunction);
};
timeVal = performance.now();
// requestAnimationFrame(mainFunction);
setInterval(mainFunction, DRAW_INTERVAL);
const findInfo = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log("X: ", x, "Y: ", y);
    const vel = myFluid.findVelocityAtPoint(new Vector(x / DRAW_SCALE, y / DRAW_SCALE));
    console.log("Velocity-> X: ", vel.x, "Y: ", vel.y);
    console.log("Pressure: ", myFluid.cells[Math.floor(y / (DRAW_SCALE * CELL_SIZE))][Math.floor(x / (DRAW_SCALE * CELL_SIZE))].pressure);
};
const addWallFromClick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    myFluid.makeWall((x / (DRAW_SCALE * myFluid.dimensions.x)) - 0.03, (y / (DRAW_SCALE * myFluid.dimensions.y)) - 0.03, (x / (DRAW_SCALE * myFluid.dimensions.x)) + 0.03, (y / (DRAW_SCALE * myFluid.dimensions.y)) + 0.03);
};
canvas.addEventListener("mousemove", findInfo);
canvas.addEventListener("click", addWallFromClick);
/*
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
*/
/*
Things to do before starting next time:
// Verify that the immutable vector creation in createCells function is correct.
// Verify that vector functions comply with immuatble arguements
// Test divergence function
Handle ensureBoundryConditions function


*/
/*
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
*/ 
