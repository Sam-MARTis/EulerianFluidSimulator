//End types
//Global variables
var canvas;
var ctx;
//End globals
var initCanvas = function () {
    canvas = document.getElementById("fluid-simulator");
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx = canvas.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.moveTo(100, 100);
    ctx.lineTo(200, 200);
    ctx.stroke();
};
var init = function () {
    initCanvas();
};
//Event listeners
addEventListener("DOMContentLoaded", init);
//End event listeners
