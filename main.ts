
const canvas = document.getElementById("projectCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth*devicePixelRatio;
canvas.height = window.innerHeight*devicePixelRatio;
const ctx = canvas.getContext("2d")

//Constants
const OVER_RELAXATION = 1.4;
const LEFT_BOUNDARY_Vel = 1;


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
    findVelocityAtPoint = (point: Vector): Vector =>{
        const x = Math.floor(point.x/this.cellSize);
        const y = Math.floor(point.y/this.cellSize);

        if(x<0){
            return new Vector(LEFT_BOUNDARY_Vel, 0);
        }
        if(x>=this.cellCount.x || y<0 || y>=this.cellCount.y){
            return new Vector(0, 0);
        }
        const cell = this.cells[y][x];
        const dx = (point.x - cell.pos.x)/cell.size;
        const dy = (point.y - cell.pos.y)/cell.size;
        if(dx<0.5){
            if(dy<0.5){
                let leftUVel: Vector|undefined;
                let leftDVel: Vector|undefined;
                let upLVel: Vector|undefined;
                let upRVel: Vector|undefined;
                
                if(x==0){
                    leftUVel = new Vector(0, 0);
                    leftDVel = new Vector(0, 0);
                    // upLVel = new Vector(LEFT_BOUNDARY_Vel, 0);
                    
                }else{
                    leftUVel = this.cells[y][x-1].vu;
                    leftDVel = this.cells[y][x-1].vd;
                    // upLVel = this.cells[y-1][x].vl;
                }
                if(y==0){
                    upLVel = new Vector(0, 0);
                    upRVel = new Vector(0, 0);
                }
                else{
                    upLVel = this.cells[y-1][x].vl;
                    upRVel = this.cells[y-1][x].vr;
                }
                if(!leftUVel || !leftDVel || !upLVel || !upRVel){
                    throw new Error("Undefined velocity. Find velocity at point failed. You got this, champ");
                }
                const xVelLeftYInterpolated = upLVel.x*(0.5-dy) + cell.vl.x*(0.5+dy);
                const xVelRightYInterpolated = upRVel.x*(0.5-dy) + cell.vr.x*(0.5+dy);
                const xVel = (xVelLeftYInterpolated*(1-dx) + xVelRightYInterpolated*dx);

                const yVelUpXInterpolated = leftUVel.y*(0.5-dx) + cell.vu.y*(0.5+dx);
                const yVelDownXInterpolated = leftDVel.y*(0.5-dx) + cell.vd.y*(0.5+dx);
                const yVel = (yVelUpXInterpolated*(1-dy) + yVelDownXInterpolated*dy);



                // const yVel: number|undefined = ((leftUVel.y*(1-dx) + leftDVel.y*(dx))*(0.5-dy) + (cell.vu.y*(1-dx) + cell.vd.y*(dx))*(0.5+dy)     )
                if(!xVel || !yVel){
                    if(!xVel){
                        throw new Error("Undefined xVel. Find velocity at point failed. You got this, champ");
                    }
                    if(!yVel){
                        throw new Error("Undefined yVel. Find velocity at point failed. You got this, champ");
                    }
                }
                return new Vector(xVel, yVel);
                

                // return cell.vl;
            }else{
                return cell.vd;
            }
        }
        else{
            if(dy<0.5){
                return cell.vu;
            }else{
                return cell.vr;
            }
        }
    }
}
