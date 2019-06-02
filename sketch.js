const NUM_CARS = 8;
const FLOOR_1_Y = 20;
const OPEN_MILLIS = 3000;
const CAR_DIMS = {width: 30, height: 45, depth: 30};
const STORY_HEIGHT = CAR_DIMS.height * 2;
const CAR_LEFT_MARGIN = 50;
const CAR_HORZ_SPACING = CAR_DIMS.width * 2.5;
let numFloors;

const dispatcher = new Dispatcher();

const cars = Array.from(Array(NUM_CARS).keys(), n => new Car(n + 1));
const DOOR = {width: CAR_DIMS.width / 4, height: CAR_DIMS.height, depth: 5};

function setup() {
    createCanvas(600, 800, WEBGL);
    numFloors = Math.floor(height / STORY_HEIGHT);
}

function randomFloor() {
    return Math.floor(random(numFloors) + 1);
}

function draw() {
    const avgCarY = cars.map(car => car.y).reduce((a, b) => a + b, 0) / cars.length;
    camera(0, -avgCarY, (height/2.0) / tan(PI*30.0 / 180.0), 0, 0, 0, 0, 1, 0);
    rotateY(map(mouseX, 0, width, -TAU / 8, TAU / 8));
    beInQuadrant1();
    background(240);

    drawFloors();

    cars.forEach(car => {
        car.update();
        car.draw();
    });

    dispatcher.process(cars);
}

function drawFloors() {
    fill(0, 0, 100, 50);
    for (let floor = 1; floor <= numFloors; ++floor) {
        push();
        const floorHeight = 4;
        translate(width / 2, yFromFloor(floor) - floorHeight / 2, 0);
        box(width, floorHeight, floor === 1 ? 150 : 50);
        pop();
    }
}

/** Places the origin at the bottom left, and makes y increase going up. */
function beInQuadrant1() {
    translate(-width / 2, height / 2, 0);
    scale(1, -1, 1);
}

function yFromFloor(floor) {
    return FLOOR_1_Y + STORY_HEIGHT * (floor - 1);
}
