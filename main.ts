//Interfaces
interface ctxObject {
    beginPath : () => void
    lineTo : (a: number, b: number) => void
    moveTo : (a: number, b: number) => void
    stroke : () => void
    scale : (a: number, b: number) => void
    strokeStyle : string
    strokeWidth : number
}


//End interfaces

//Classes


//Vector
class VelocityVector {
    magnitude: number
    immutable: boolean

    constructor( _magnitude:number = 0, _immutable: boolean = false){
        this.magnitude = _magnitude
        this.immutable = _immutable
    }

    incrementValue = ( _value : number): void => {
        if(this.immutable ==false){
            this.magnitude += _value
        }
    }
    sudoIncrementValue = ( _value: number): void => {
        this.magnitude += _value
    }
    mag = (): number => {
        return this.magnitude
    }
    isImmutable = (): boolean => {
        return this.immutable
    }
}
//End vector



//Grid 
//End grid


//End classes






//Global variables
let canvas: any
let ctx: ctxObject


//End globals


const initCanvas = () : void => {
    canvas = document.getElementById("fluid-simulator")
    canvas.style.width = window.innerWidth + "px"
    canvas.style.height = window.innerHeight + "px"
    canvas.width = window.innerWidth * devicePixelRatio
    canvas.height = window.innerHeight * devicePixelRatio
    ctx = canvas.getContext("2d")
    ctx.scale(devicePixelRatio, devicePixelRatio)

    ctx.beginPath()
    ctx.strokeStyle = "red"
    ctx.moveTo(100, 100)
    ctx.lineTo(200, 200)
    ctx.stroke()

    console.log("Canvas initialised")


}
const initGrid = (): void => {
    console.log("Grid initialised")
}

const initWalls = (): void => {
    console.log("Walls initialised")
}

const initBoundryConditions = (): void => {
    console.log("Boundry consitions initialized")
}

const initFinalPreparations = (): void => {
    console.log("Final preparations complete")
}



const mainLoop = (): void => {
    requestAnimationFrame(mainLoop)
}

const init = () : void => {
    initCanvas()
    initGrid()
    initWalls()
    initBoundryConditions()
    initFinalPreparations()
    requestAnimationFrame(mainLoop)
}




//Event listeners
addEventListener("DOMContentLoaded", init)

//End event listeners