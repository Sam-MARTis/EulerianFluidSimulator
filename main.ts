
const canvas = document.getElementById("projectCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth*devicePixelRatio;
canvas.height = window.innerHeight*devicePixelRatio;
const ctx = canvas.getContext("2d")

//Constants
const OVER_RELAXATION = 1.4;


//End constants




class Vector{
    x: number;
    y: number;
    isMutable: boolean = false;
    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
    }
    update(x: number, y: number, override: boolean = false){
        if(this.isMutable || override){
            this.x = x;
            this.y = y;
        }
    }
}

class Cell{
    pos: Vector;
    size: Vector;
    isWall: boolean;
    vectors: Vector[] = [];
    vl: Vector;
    vu: Vector;
    vr: Vector;
    vd: Vector;

    constructor(pos: Vector, size: Vector, isWall: boolean, vl: Vector, vu: Vector, vr: Vector, vd: Vector){
        this.pos = pos;
        this.size = size;
        this.isWall = isWall;
        this.vl = vl;
        this.vu = vu;
        this.vr = vr;
        this.vd = vd;
        this.vectors = [vl, vu, vr, vd];
    }

    findDivergence = (): number =>{
        return this.vl.x - this.vr.x + this.vu.y - this.vd.y;;
    }
    makeDivergenceZero = (): void =>{
        const divergence = this.findDivergence();
        this.vl.x -= OVER_RELAXATION*divergence/4;
        this.vr.x += OVER_RELAXATION*divergence/4;
        this.vu.y -= OVER_RELAXATION*divergence/4;
        this.vd.y += OVER_RELAXATION*divergence/4;
    }




}
