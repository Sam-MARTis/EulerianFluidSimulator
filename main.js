"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
//Constants
const OVER_RELAXATION = 1.4;
const LEFT_BOUNDARY_Vel = 1;
//End constants
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
                    const pos = new Vector(i * this.cellSize, j * this.cellSize);
                    const vl = new Vector(0, 0);
                    const vu = new Vector(0, 0);
                    const vr = new Vector(0, 0);
                    const vd = new Vector(0, 0);
                    this.cells[i].push(new Cell(pos, this.cellSize, false, vl, vu, vr, vd));
                }
            }
        };
        this.findVelocityAtPoint = (point) => {
            const x = Math.floor(point.x / this.cellSize);
            const y = Math.floor(point.y / this.cellSize);
            if (x < 0) {
                return new Vector(LEFT_BOUNDARY_Vel, 0);
            }
            if (x >= this.cellCount.x || y < 0 || y >= this.cellCount.y) {
                return new Vector(0, 0);
            }
            const cell = this.cells[y][x];
            const dx = (point.x - cell.pos.x) / cell.size;
            const dy = (point.y - cell.pos.y) / cell.size;
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
                    if (!leftUVel || !leftDVel || !upLVel || !upRVel) {
                        throw new Error("Undefined velocity. Find velocity at point failed. You got this, champ");
                    }
                    const xVel = (cell.vl.x * (0.5 + dx) + upLVel.x * (0.5 - dx)) * (1 - dy) + (cell.vr.x * (0.5 + dx) + upRVel.x * (0.5 - dx)) * dy;
                    const yVel = ((leftUVel.y * (1 - dx) + leftDVel.y * (dx)) * (0.5 - dy) + (cell.vu.y * (1 - dx) + cell.vd.y * (dx)) * (0.5 + dy));
                    if (!xVel || !yVel) {
                        if (!xVel) {
                            throw new Error("Undefined xVel. Find velocity at point failed. You got this, champ");
                        }
                        if (!yVel) {
                            throw new Error("Undefined yVel. Find velocity at point failed. You got this, champ");
                        }
                    }
                    return new Vector(xVel, yVel);
                    // return cell.vl;
                }
                else {
                    return cell.vd;
                }
            }
            else {
                if (dy < 0.5) {
                    return cell.vu;
                }
                else {
                    return cell.vr;
                }
            }
        };
        this.dimensions = new Vector(x_dim, y_dim);
        this.cellSize = cellSize;
        this.cellCount = new Vector(Math.floor(x_dim / cellSize), Math.floor(y_dim / cellSize));
        this.createCells();
    }
}
