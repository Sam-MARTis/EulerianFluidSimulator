"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
//Constants
const OVER_RELAXATION = 1.4;
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
        this.dimensions = new Vector(x_dim, y_dim);
        this.cellSize = cellSize;
        this.cellCount = new Vector(Math.floor(x_dim / cellSize), Math.floor(y_dim / cellSize));
        this.createCells();
    }
}
