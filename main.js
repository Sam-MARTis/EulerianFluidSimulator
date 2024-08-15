"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
//Constants
const OVER_RELAXATION = 1.4;
const LEFT_BOUNDARY_Vel = 2;
//End constants
console.clear();
class Vector {
    constructor(x, y) {
        this.isMutable = false;
        this.update = (x, y, override = false) => {
            if (this.isMutable || override) {
                this.x = x;
                this.y = y;
            }
        };
        this.cache = (x, y) => {
            this.x_stored = x;
            this.y_stored = y;
        };
        this.applyCache = () => {
            this.x = this.x_stored;
            this.y = this.y_stored;
        };
        this.x = x;
        this.y = y;
        this.x_stored = x;
        this.y_stored = y;
    }
}
class Cell {
    constructor(pos, size, isWall, vl, vu, vr, vd) {
        this.vectors = [];
        this.findDivergence = () => {
            return this.vl.x - this.vr.x + this.vu.y - this.vd.y;
            ;
        };
        this.makeDivergenceZero = () => {
            const divergence = this.findDivergence();
            this.vl.x -= OVER_RELAXATION * divergence / 4;
            this.vr.x += OVER_RELAXATION * divergence / 4;
            this.vu.y -= OVER_RELAXATION * divergence / 4;
            this.vd.y += OVER_RELAXATION * divergence / 4;
        };
        this.pos = pos;
        this.size = size;
        this.isWall = isWall;
        this.vl = vl;
        this.vu = vu;
        this.vr = vr;
        this.vd = vd;
        this.vectors = [vl, vu, vr, vd];
    }
}
class Fluid {
    constructor(x_dim, y_dim, cellSize) {
        this.cells = [];
        this.createCells = () => {
            for (let i = 0; i < this.cellCount.x; i++) {
                this.cells.push([]);
                for (let j = 0; j < this.cellCount.y; j++) {
                    const pos = new Vector(j * this.cellSize, i * this.cellSize);
                    const vl = new Vector(0, 0);
                    const vu = new Vector(0, 0);
                    const vr = new Vector(0, 0);
                    const vd = new Vector(0, 0);
                    this.cells[i].push(new Cell(pos, this.cellSize, false, vl, vu, vr, vd));
                }
            }
            for (let i = 0; i < this.cellCount.y; i++) {
                this.cells[i][0].vl = new Vector(LEFT_BOUNDARY_Vel, 0);
            }
        };
        this.findVelocityAtPoint = (point) => {
            const x = Math.floor(point.x / this.cellSize);
            const y = Math.floor(point.y / this.cellSize);
            // console.log("X: ", x, "Y: ", y);
            if (x < 0) {
                console.warn("Returning left boundary vel");
                return new Vector(LEFT_BOUNDARY_Vel, 0);
            }
            if (x >= this.cellCount.x || y < 0 || y >= this.cellCount.y) {
                console.warn("Returning out of vertical boundry vel");
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
                        upLVel = new Vector(0, 0);
                        upRVel = new Vector(0, 0);
                    }
                    else {
                        upLVel = this.cells[y - 1][x].vl;
                        upRVel = this.cells[y - 1][x].vr;
                    }
                    if (leftUVel === undefined || leftDVel === undefined || upLVel === undefined || upRVel === undefined) {
                        throw new Error("Undefined founf velocity in condition 1. Find velocity at point failed. You got this, champ");
                    }
                    // console.table([leftUVel, leftDVel, upLVel, upRVel, cell.vl, cell.vr, cell.vu, cell.vd]);
                    const xVelLeftYInterpolated = upLVel.x * (0.5 - dy) + cell.vl.x * (0.5 + dy);
                    const xVelRightYInterpolated = upRVel.x * (0.5 - dy) + cell.vr.x * (0.5 + dy);
                    const xVel = (xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx);
                    const yVelUpXInterpolated = leftUVel.y * (0.5 - dx) + cell.vu.y * (0.5 + dx);
                    const yVelDownXInterpolated = leftDVel.y * (0.5 - dx) + cell.vd.y * (0.5 + dx);
                    const yVel = (yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy);
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
                    if (y == (this.cellCount.y - 1)) {
                        downLVel = new Vector(0, 0);
                        downRVel = new Vector(0, 0);
                    }
                    else {
                        downLVel = this.cells[y + 1][x].vl;
                        downRVel = this.cells[y + 1][x].vr;
                    }
                    if (leftUVel === undefined || leftDVel === undefined || downLVel === undefined || downRVel === undefined) {
                        throw new Error("Undefined found velocity in condition 2. Find velocity at point failed. You got this, champ");
                    }
                    const xVelLeftYInterpolated = downLVel.x * (dy - 0.5) + cell.vl.x * (1 - (dy - 0.5));
                    const xVelRightYInterpolated = downRVel.x * (dy - 0.5) + cell.vr.x * (1 - (dy - 0.5));
                    const xVel = (xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx);
                    const yVelUpXInterpolated = leftUVel.y * (0.5 - dx) + cell.vu.y * (0.5 + dx);
                    const yVelDownXInterpolated = leftDVel.y * (0.5 - dx) + cell.vd.y * (0.5 + dx);
                    const yVel = (yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy);
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
                    if (x == (this.cellCount.x - 1)) {
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
                    if (rightUVel === undefined || rightDVel === undefined || upLVel === undefined || upRVel === undefined) {
                        throw new Error("Undefined found velocity in condition 3. Find velocity at point failed. You got this, champ");
                    }
                    const xVelLeftYInterpolated = upLVel.x * (0.5 - dy) + cell.vl.x * (0.5 + dy);
                    const xVelRightYInterpolated = upRVel.x * (0.5 - dy) + cell.vr.x * (0.5 + dy);
                    const xVel = (xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx);
                    const yVelUpXInterpolated = rightUVel.y * (dx - 0.5) + cell.vu.y * (1 - (dx - 0.5));
                    const yVelDownXInterpolated = rightDVel.y * (dx - 0.5) + cell.vd.y * (1 - (dx - 0.5));
                    const yVel = (yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy);
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
                    console.log("Corner");
                    let rightUVel;
                    let rightDVel;
                    let downLVel;
                    let downRVel;
                    if (x >= (this.cellCount.x - 1)) {
                        rightUVel = this.cells[y][x].vu;
                        rightDVel = this.cells[y][x].vd;
                        // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                    }
                    else {
                        rightUVel = this.cells[y][x + 1].vu;
                        rightDVel = this.cells[y][x + 1].vd;
                        // upLVel = this.cells[y-1][x].vl;
                    }
                    console.log("Point 1");
                    if (y == (this.cellCount.y - 1)) {
                        // console.log("Y found")
                        downLVel = new Vector(0, 0);
                        downRVel = new Vector(0, 0);
                    }
                    else {
                        // console.log('Y not found')
                        downLVel = this.cells[y + 1][x].vl;
                        downRVel = this.cells[y + 1][x].vr;
                    }
                    if (rightUVel === undefined || rightDVel === undefined || downLVel === undefined || downRVel === undefined) {
                        throw new Error("Undefined found velocity in condition 4. Find velocity at point failed. You got this, champ");
                    }
                    console.log("Point 2");
                    const xVelLeftYInterpolated = downLVel.x * (0.5 - dy) + cell.vl.x * (1 - (0.5 - dy));
                    const xVelRightYInterpolated = downRVel.x * (0.5 - dy) + cell.vr.x * (1 - (0.5 - dy));
                    const xVel = (xVelLeftYInterpolated * (1 - dx) + xVelRightYInterpolated * dx);
                    const yVelUpXInterpolated = rightUVel.y * (dx - 0.5) + cell.vu.y * (1 - (dx - 0.5));
                    const yVelDownXInterpolated = rightDVel.y * (dx - 0.5) + cell.vd.y * (1 - (dx - 0.5));
                    const yVel = (yVelUpXInterpolated * (1 - dy) + yVelDownXInterpolated * dy);
                    // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
                    if (xVel === undefined || yVel === undefined) {
                        if (!xVel) {
                            throw new Error("Undefined xVel in condition 4. Find velocity at point failed. You got this, champ");
                        }
                        if (!yVel) {
                            throw new Error("Undefined yVel in condition 4. Find velocity at point failed. You got this, champ");
                        }
                    }
                    console.log(xVel, yVel);
                    return new Vector(xVel, yVel);
                }
            }
        };
        this.dimensions = new Vector(x_dim, y_dim);
        this.cellSize = cellSize;
        this.cellCount = new Vector(Math.floor(x_dim / cellSize), Math.floor(y_dim / cellSize));
        this.createCells();
    }
}
let myFluid = new Fluid(3, 3, 1);
console.log(myFluid.findVelocityAtPoint(new Vector(2.9, 0.1)).x);
