
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
    x_stored: number;
    y_stored: number;
    isMutable: boolean = false;
    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
        this.x_stored = x;
        this.y_stored = y;
    }
    update = (x: number, y: number, override: boolean = false): void => {
        if(this.isMutable || override){
            this.x = x;
            this.y = y;
        }
    }
    cache = (x: number, y: number): void => {
        this.x_stored = x;
        this.y_stored = y;
    }
    applyCache = (): void =>{
        this.x = this.x_stored;
        this.y = this.y_stored;
    }
}

class Cell{
    pos: Vector;
    size: number;
    isWall: boolean;
    vectors: Vector[] = [];
    vl: Vector;
    vu: Vector;
    vr: Vector;
    vd: Vector;

    constructor(pos: Vector, size: number, isWall: boolean, vl: Vector, vu: Vector, vr: Vector, vd: Vector){
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

class Fluid{
    cells: Cell[][] = [];
    dimensions: Vector;
    cellSize: number;
    cellCount: Vector

    constructor(x_dim: number, y_dim: number, cellSize: number){
        this.dimensions = new Vector(x_dim, y_dim);
        this.cellSize = cellSize;
        this.cellCount = new Vector(Math.floor(x_dim/cellSize), Math.floor(y_dim/cellSize));
        this.createCells();
    }

    createCells = (): void => {
        for(let i = 0; i<this.cellCount.x; i++){
            this.cells.push([]);
            for(let j = 0; j<this.cellCount.y; j++){
                const pos = new Vector(i*this.cellSize, j*this.cellSize);
                const vl = new Vector(0, 0);
                const vu = new Vector(0, 0);
                const vr = new Vector(0, 0);
                const vd = new Vector(0, 0);
                this.cells[i].push(new Cell(pos, this.cellSize, false, vl, vu, vr, vd));
            }
        }
    }


    

}
