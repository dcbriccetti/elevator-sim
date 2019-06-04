import Dispatcher from './dispatcher.js'
import Car from './car.js'

new p5(p => {
    const NUM_CARS = 8;
    const FLOOR_1_Y = 10;
    const CAR_DIMS = {width: 25, height: 25, depth: 40};
    const STORY_HEIGHT = CAR_DIMS.height * 1.7;
    let font;
    let mouseHasMoved = false;

    p.yFromFloor = function(floor) {
        return FLOOR_1_Y + STORY_HEIGHT * (floor - 1);
    };
    const canvasWidth = 1000;
    const cars = Array.from(Array(NUM_CARS).keys(), n => new Car(p, canvasWidth, CAR_DIMS, FLOOR_1_Y, NUM_CARS, n + 1));
    const dispatcher = new Dispatcher(p, cars);

    p.preload = function() {
        font = p.loadFont('assets/Asimov.otf');
    };

    p.setup = function() {
        p.createCanvas(600, canvasWidth, p.WEBGL).parent('main');
        p.numFloors = Math.floor(p.height / STORY_HEIGHT);
        p.textFont(font);
        p.textAlign(p.CENTER, p.CENTER);
    };

    p.mouseMoved = function() {
        mouseHasMoved = true;
    };

    function setCameraBasedOnAvgCarHeight() {
        const avgCarY = cars.map(car => car.y).reduce((a, b) => a + b, 0) / cars.length;
        p.camera(0, -avgCarY, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0); // Most args are defaults
    }

    p.draw = function() {
        setCameraBasedOnAvgCarHeight();
        if (mouseHasMoved) p.rotateY(p.map(p.mouseX, 0, p.width, -p.TAU / 8, p.TAU / 8));
        beInQuadrant1();
        p.background(240);

        drawFloors();

        cars.forEach(car => {
            car.update();
            car.draw();
        });

        dispatcher.process(cars);
    };

    function drawFloors() {
        p.noStroke();
        p.fill(0, 0, 100, 20);
        for (let floor = 1; floor <= p.numFloors; ++floor) {
            p.push();
            const floorHeight = 4;
            p.translate(p.width / 2, p.yFromFloor(floor) - floorHeight / 2, floor === 1 ? -25 : 0);
            p.box(p.width, floorHeight, floor === 1 ? 100 : 50);
            p.pop();
        }
    }

    /** Places the origin at the bottom left, and makes y increase going up. */
    function beInQuadrant1() {
        p.translate(-p.width / 2, p.height / 2, 0);
        p.scale(1, -1, 1);
    }
});
