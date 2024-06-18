//End interfaces
//Hyperparameters
var OVER_RELAXATION = 1.998;
var CELL_SIZE = 1;
var BOUNDRY_VEL = 2;
var TIME_STEP = 0.1;
var PRESSURE_CONSTANT = 10;
//End hyperparameters
//Classes
//Vector
var VelocityVector = /** @class */ (function () {
    function VelocityVector(_magnitude, _immutable) {
        if (_magnitude === void 0) { _magnitude = 0; }
        if (_immutable === void 0) { _immutable = false; }
        var _this = this;
        this.incrementValue = function (_value) {
            if (_this.immutable == false) {
                _this.magnitude += _value;
            }
        };
        this.sudoIncrementValue = function (_value) {
            _this.magnitude += _value;
        };
        this.assignValue = function (_value) {
            if (_this.immutable == false) {
                _this.magnitude = _value;
            }
        };
        this.sudoAssignValue = function (_value) {
            _this.magnitude = _value;
        };
        this.mag = function () {
            return _this.magnitude;
        };
        this.isImmutable = function () {
            return _this.immutable;
        };
        this.makeImmutable = function () {
            _this.immutable = true;
        };
        this.makeMutable = function () {
            _this.immutable = false;
        };
        this.storeValues = function (val) {
            if (_this.immutable == false) {
                _this.storedMagnitude = val;
            }
        };
        this.sudoStoreValues = function (val) {
            _this.storedMagnitude = val;
        };
        this.applyStoredValue = function () {
            if (_this.immutable == false) {
                _this.magnitude = _this.storedMagnitude;
            }
        };
        this.sudoApplyStoredValue = function () {
            _this.magnitude = _this.storedMagnitude;
        };
        this.magnitude = _magnitude;
        this.immutable = _immutable;
        this.id = Math.floor(Math.random() * 10000);
        this.storedMagnitude = _magnitude;
    }
    return VelocityVector;
}());
//End vector
//Cell
var Cell = /** @class */ (function () {
    function Cell(_x, _y, _isFluid) {
        var _this = this;
        this.mutVArr = [];
        this.pressure = 0;
        this.cellSize = CELL_SIZE;
        this.assignVelocities = function (_vl, _vu, _vr, _vd) {
            _this.vl = _vl;
            _this.vu = _vu;
            _this.vr = _vr;
            _this.vd = _vd;
            _this.vArr = [_vl, _vu, _vr, _vd];
        };
        this.checkSurroundings = function () {
            _this.mutVArr = [];
            for (var i = 0; i < _this.vArr.length; i++) {
                if (!_this.vArr[i].isImmutable()) {
                    _this.mutVArr.push(i);
                }
            }
        };
        this.queryVelocity = function (x0, y0) {
            if (_this.x - x0 < 0 || _this.x - x0 > CELL_SIZE) {
                return [0, 0, 0]; //First value is success/failure
            }
            else {
                var dx = (_this.x - x0) / CELL_SIZE;
                var dy = (_this.y - y0) / CELL_SIZE;
                return [
                    1,
                    _this.vl.mag() * (1 - dx) + _this.vr.mag() * dx,
                    _this.vu.mag() * (1 - dx) + _this.vd.mag() * dx,
                ];
            }
        };
        this.recieveVelocities = function (l, u, r, d) {
            if (typeof l === "boolean") {
                l = _this.vl.mag();
            }
            if (typeof u === "boolean") {
                u = _this.vu.mag();
            }
            if (typeof r === "boolean") {
                r = _this.vr.mag();
            }
            if (typeof d === "boolean") {
                d = _this.vd.mag();
            }
            _this.tempVStorage = [l, u, r, d];
        };
        this.applyVelocityValues = function () {
            if (!_this.isFluid) {
                return;
            }
            for (var i = 0; i < 4; i++) {
                _this.vArr[i].assignValue(_this.tempVStorage[i]);
            }
        };
        this.makeDivergenceFree = function () {
            if (!_this.isFluid) {
                return;
            }
            var divergence = 0;
            divergence = _this.vl.mag() + _this.vu.mag() - _this.vr.mag() - _this.vd.mag();
            // console.log(divergence)
            // let mutLen = this.mutVArr.length
            _this.pressure += divergence;
            divergence /= _this.mutVArr.length;
            divergence *= OVER_RELAXATION;
            _this.vl.incrementValue(-1 * divergence);
            _this.vu.incrementValue(-1 * divergence);
            _this.vr.incrementValue(divergence);
            _this.vd.incrementValue(divergence);
        };
        this.resetPressure = function () {
            _this.pressure = 0;
        };
        this.makeObstacle = function () {
            for (var i = 0; i < 4; i++) {
                _this.vArr[i].sudoAssignValue(0);
                _this.vArr[i].makeImmutable();
                _this.isFluid = false;
            }
        };
        this.x = _x;
        this.y = _y;
        this.isFluid = _isFluid;
        // this.mutVArr = [false, false, false, false]
    }
    return Cell;
}());
//End Cell
//Fluid
var Fluid = /** @class */ (function () {
    function Fluid(_countX, _countY) {
        var _this = this;
        this.dimX = 0;
        this.dimY = 0;
        this.countX = 0;
        this.countY = 0;
        this.horizVArr = [];
        this.vertVArr = [];
        this.cellArr = [];
        this.createCells = function () {
            var row = [];
            for (var j = 0; j < _this.countY; j++) {
                row = [];
                for (var i = 0; i < _this.countX; i++) {
                    row.push(new Cell(i * CELL_SIZE, j * CELL_SIZE, true));
                }
                _this.cellArr.push(row);
            }
        };
        this.createHorizVelVectors = function () {
            var row = [];
            for (var j = 0; j < _this.countY; j++) {
                row = [];
                for (var i = 0; i < _this.countX + 1; i++) {
                    row.push(new VelocityVector(0, false));
                }
                _this.horizVArr.push(row);
            }
        };
        this.createVertVelVectors = function () {
            var row = [];
            for (var j = 0; j < _this.countY; j++) {
                row = [];
                for (var i = 0; i < _this.countX; i++) {
                    row.push(new VelocityVector(0, false));
                }
                _this.vertVArr.push(row);
            }
            _this.vertVArr.push(_this.vertVArr[0]); //Loops back to the top
        };
        this.bindVelocitiesToCell = function () {
            for (var j = 0; j < _this.cellArr.length; j++) {
                for (var i = 0; i < _this.cellArr[j].length; i++) {
                    _this.cellArr[j][i].assignVelocities(_this.horizVArr[j][i], _this.vertVArr[j][i], _this.horizVArr[j][i + 1], _this.vertVArr[j + 1][i]);
                }
            }
            for (var j = 0; j < _this.cellArr.length; j++) {
                for (var i = 0; i < _this.cellArr[0].length; i++) {
                    _this.cellArr[j][i].checkSurroundings();
                }
            }
        };
        this.applyBoundryConditions = function () {
            var currentCell;
            for (var j = 0; j < _this.cellArr.length; j++) {
                currentCell = _this.cellArr[j][0];
                currentCell.makeObstacle();
                currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
                currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
                currentCell = _this.cellArr[j][1];
                currentCell.makeObstacle();
                currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
                currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
                currentCell = _this.cellArr[j][2];
                currentCell.makeObstacle();
                currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
                currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
            }
            for (var j = 0; j < 30; j++) {
                currentCell = _this.cellArr[j][j];
                currentCell.makeObstacle();
                currentCell.vr.sudoAssignValue(BOUNDRY_VEL);
                currentCell.vl.sudoAssignValue(BOUNDRY_VEL);
            }
        };
        this.maintainAbsorbentBoundry = function () {
            var currentCell;
            for (var j = 0; j < _this.cellArr.length; j++) {
                currentCell = _this.cellArr[j][0];
                // currentCell.makeObstacle()
                currentCell.vr.sudoAssignValue(currentCell.vl.mag());
                // currentCell.vl.sudoAssignValue(BOUNDRY_VEL)
            }
        };
        this.makeFluidDivergenceFree = function (iterations) {
            for (var c = 0; c < iterations; c++) {
                _this.maintainAbsorbentBoundry();
                for (var i = 0; i < _this.cellArr[0].length; i++) {
                    for (var j = 0; j < _this.cellArr.length; j++) {
                        _this.cellArr[j][i].makeDivergenceFree();
                    }
                }
                for (var j = 0; j < _this.cellArr.length; j++) {
                    for (var i = 0; i < _this.cellArr[j].length; i++) {
                        _this.cellArr[j][i].makeDivergenceFree();
                    }
                }
                for (var j = 0; j < _this.cellArr.length; j++) {
                    for (var i = j % 2; i < _this.cellArr[j].length; i += 2) {
                        _this.cellArr[j][i].makeDivergenceFree();
                    }
                }
                for (var j = 0; j < _this.cellArr.length; j++) {
                    for (var i = (j + 1) % 2; i < _this.cellArr[j].length; i += 2) {
                        _this.cellArr[j][i].makeDivergenceFree();
                    }
                }
                for (var j = 0; j < _this.cellArr.length; j++) {
                    for (var i = 0; i < _this.cellArr[j].length; i++) {
                        _this.cellArr[j][i].makeDivergenceFree();
                    }
                }
                for (var i = 0; i < _this.cellArr[0].length; i++) {
                    for (var j = 0; j < _this.cellArr.length; j++) {
                        _this.cellArr[j][i].makeDivergenceFree();
                    }
                }
            }
        };
        this.queryVelocityAt = function (x, y) {
            if (x < 0) {
                x = 0;
            }
            if (x > _this.countX * CELL_SIZE - 1) {
                x = _this.countX * CELL_SIZE - 1;
            }
            while (y <= -1) {
                y += _this.countY * CELL_SIZE;
            }
            while (y >= _this.countY * CELL_SIZE) {
                y -= _this.countY * CELL_SIZE;
            }
            var y_norm = y / CELL_SIZE;
            var x_norm = x / CELL_SIZE;
            var dx;
            var dy;
            var x_switch;
            var y_switch;
            var velXArr = [];
            var velYArr = [];
            dy = y_norm - Math.floor(y_norm);
            dx = x_norm - Math.floor(x_norm);
            var xVelWeights = [];
            var yVelWeights = [];
            if (dy > 0.5) {
                y_switch = 1;
            }
            else {
                y_switch = -1;
            }
            if (dx > 0.5) {
                x_switch = 1;
            }
            else {
                x_switch = -1;
            }
            var CellX;
            var CellY;
            var currentCell = _this.cellArr[Math.floor(y_norm)][Math.floor(x_norm)];
            if (x_norm >= 1 &&
                x_norm < _this.countX - 1 &&
                y_norm >= 1 &&
                y_norm < _this.countY - 1) {
                CellX = _this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
                CellY = _this.cellArr[Math.floor(y_norm) + y_switch][Math.floor(x_norm)];
            }
            else if (x_norm < 1) {
                if (x_switch == -1) {
                    return [BOUNDRY_VEL, 0];
                }
                else {
                    CellX = _this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
                }
            }
            else {
                if (x_norm > _this.countX - 1) {
                    if (x_switch == 1) {
                        CellX = currentCell;
                    }
                    else {
                        CellX =
                            _this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
                    }
                }
                else {
                    CellX = _this.cellArr[Math.floor(y_norm)][Math.floor(x_norm) + x_switch];
                }
            }
            if ((y_norm < 1) && (y_switch == -1)) {
                CellY = _this.cellArr[_this.cellArr.length - 1][Math.floor(x_norm)];
            }
            else if ((y_norm >= (_this.countY - 1)) && (y_switch == 1)) {
                CellY = _this.cellArr[0][Math.floor(x_norm)];
            }
            else {
                CellY = _this.cellArr[Math.floor(y_norm) + y_switch][Math.floor(x_norm)];
            }
            velXArr = [
                currentCell.vl.mag(),
                currentCell.vr.mag(),
                CellX.vl.mag(),
                CellX.vr.mag(),
            ];
            velYArr = [
                currentCell.vd.mag(),
                currentCell.vu.mag(),
                CellY.vd.mag(),
                CellY.vu.mag(),
            ];
            if (x_switch == 1) {
                yVelWeights = [
                    (1 - (dx - 0.5)) * dy,
                    (1 - (dx - 0.5)) * (1 - dy),
                    (dx - 0.5) * dy,
                    (dx - 0.5) * (1 - dy),
                ];
            }
            else {
                yVelWeights = [
                    (1 - (0.5 - dx)) * dy,
                    (1 - (0.5 - dx)) * (1 - dy),
                    (0.5 - dx) * dy,
                    (0.5 - dx) * (1 - dy),
                ];
            }
            if (y_switch == 1) {
                xVelWeights = [
                    (1 - dx) * (1 - (dy - 0.5)),
                    dx * (1 - (dy - 0.5)),
                    (1 - dx) * (dy - 0.5),
                    dx * (dy - 0.5),
                ];
            }
            else {
                xVelWeights = [
                    (1 - dx) * (1 - (0.5 - dy)),
                    dx * (1 - (0.5 - dy)),
                    (1 - dx) * (0.5 - dy),
                    dx * (0.5 - dy),
                ];
            }
            var vx = 0;
            var vy = 0;
            for (var i = 0; i < 4; i++) {
                vx += velXArr[i] * xVelWeights[i];
                vy += velYArr[i] * yVelWeights[i];
            }
            return [vx, vy];
        };
        this.advectVeclocityAt = function (x, y, dt) {
            var vel = _this.queryVelocityAt(x, y);
            var intermediateVel = _this.queryVelocityAt(x - (vel[0] * dt / 2), y - (vel[1] * dt / 2));
            return _this.queryVelocityAt(x - (intermediateVel[0] * dt), y - (intermediateVel[1] * dt));
        };
        this.advectVelocityOfCell = function () {
            var currentCell;
            var x, y;
            for (var j = 0; j < _this.cellArr.length; j++) {
                for (var i = 1; i < _this.cellArr[0].length; i++) {
                    try {
                        currentCell = _this.cellArr[j][i];
                        x = currentCell.x;
                        y = currentCell.y;
                        currentCell.vl.storeValues(_this.advectVeclocityAt(x, y, TIME_STEP)[0]);
                        currentCell.vr.storeValues(_this.advectVeclocityAt(x + 1, y, TIME_STEP)[0]);
                        currentCell.vu.storeValues(_this.advectVeclocityAt(x, y - 1, TIME_STEP)[0]);
                        currentCell.vd.storeValues(_this.advectVeclocityAt(x, y + 1, TIME_STEP)[0]);
                    }
                    catch (_a) {
                        console.error("Error at: ", i, ", ", j, "\n");
                    }
                }
            }
            for (var j = 0; j < _this.cellArr.length; j++) {
                for (var i = 1; i < _this.cellArr[0].length; i++) {
                    currentCell = _this.cellArr[j][i];
                    x = currentCell.x;
                    y = currentCell.y;
                    currentCell.vl.applyStoredValue();
                    currentCell.vr.applyStoredValue();
                    currentCell.vu.applyStoredValue();
                    currentCell.vd.applyStoredValue();
                }
            }
        };
        this.countX = _countX;
        this.countY = _countY;
    }
    return Fluid;
}());
//End fluid
//End classes
//Global variables
var canvas;
var ctx;
var fluid;
//End globals
var initCanvas = function () {
    canvas = document.getElementById("fluid-simulator");
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx = canvas.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);
    console.log("Canvas initialised");
};
var display = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cell;
    var colourParameter;
    console.log(fluid.cellArr.length);
    for (var j = 0; j < fluid.cellArr.length; j++) {
        for (var i = 0; i < fluid.cellArr[0].length; i++) {
            cell = fluid.cellArr[j][i];
            if (cell.isFluid) {
                colourParameter = cell.pressure * PRESSURE_CONSTANT;
                ctx.fillStyle = "rgb(".concat(colourParameter, ", 0, ").concat(255 - colourParameter, ")");
            }
            else {
                ctx.fillStyle = "green";
            }
            ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }
};
var initGrid = function () {
    console.log("Grid initialised");
};
var initWalls = function () {
    console.log("Walls initialised");
};
var initBoundryConditions = function () {
    console.log("Boundry consitions initialized");
};
var initFinalPreparations = function () {
    console.log("Final preparations complete");
};
var mainLoop = function () {
    requestAnimationFrame(mainLoop);
};
var init = function () {
    initCanvas();
    fluid = new Fluid(200, 200);
    fluid.createCells();
    fluid.createHorizVelVectors();
    fluid.createVertVelVectors();
    fluid.bindVelocitiesToCell();
    fluid.applyBoundryConditions();
    fluid.makeFluidDivergenceFree(100);
    display();
    setInterval(function () {
        fluid.advectVelocityOfCell();
        fluid.makeFluidDivergenceFree(20);
    }, 200);
    console.log("Display completed");
};
/*
//






//





//
*/
var debugValues = function (e) {
    var cell = fluid.cellArr[Math.floor(e.layerY / CELL_SIZE)][Math.floor(e.layerX / CELL_SIZE)];
    console.log("Coordinates: ".concat(e.layerX / CELL_SIZE, ", ").concat(e.layerY / CELL_SIZE, "\nIsWall: ").concat(!cell.isFluid, "\nPressure of cell is: ").concat(cell.pressure, "\n    \n Velocities:\n    \nvl: ").concat(cell.vl.mag(), ", ").concat(cell.vl.isImmutable(), ", ").concat(cell.vl.id, "\n    \nvu: ").concat(cell.vu.mag(), ", ").concat(cell.vu.isImmutable(), ", ").concat(cell.vu.id, "\n    \nvr: ").concat(cell.vr.mag(), ", ").concat(cell.vr.isImmutable(), ", ").concat(cell.vr.id, "\n    \nvd: ").concat(cell.vd.mag(), ", ").concat(cell.vd.isImmutable(), ", ").concat(cell.vd.id));
};
var button = document.getElementById("divergenceStep");
//Event listeners
addEventListener("DOMContentLoaded", init);
addEventListener("mousemove", debugValues);
button.addEventListener("click", function () {
    console.log("Divergence calculating");
    fluid.makeFluidDivergenceFree(100);
});
//End event listeners
