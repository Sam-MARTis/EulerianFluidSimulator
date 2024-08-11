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
        this.x = x;
        this.y = y;
    }
    update(x, y, override = false) {
        if (this.isMutable || override) {
            this.x = x;
            this.y = y;
        }
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
