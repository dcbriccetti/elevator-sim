import Dispatcher from './dispatcher.js'
import Car from './car.js'

new p5(p => {
    function createSettings() {
        const car = p.createVector(1, 1, 1.5).mult(50);
        return {
            numCars: 5,
            geom: {
                canvas: p.createVector(600, 1000),
                car: car,
                storyHeight: car.y * 1.7
            },
            elevSpeed: 3,
            view: 0,
            passengerLoad: 0,
        };
    }

    const settings = createSettings();
    const passengerLoadTypes = ['Varying', 'Very Light', 'Light', 'Moderate', 'Heavy', 'Very Heavy', 'Insane'];
    settings.passengerLoadNumManualLevels = passengerLoadTypes.length - 1; // The first is not manual
    let font;
    let mouseHasMoved = false;

    p.yFromFloor = function(floor) {
        return settings.geom.storyHeight * (floor - 1);
    };
    const canvasWidth = 1000;
    const cars = Array.from(Array(settings.numCars).keys(), n => new Car(p, settings, n + 1));
    const dispatcher = new Dispatcher(p, settings, cars);

    p.preload = function() {
        font = p.loadFont('assets/Asimov.otf');
    };

    function createKnobs() {
        const elevSpeed = p.select('#elevSpeed');
        elevSpeed.value(settings.elevSpeed);
        elevSpeed.changed(() => settings.elevSpeed = elevSpeed.value());

        const projection = p.createSelect(); // Using select resulted in a p5 error
        ['Perspective', 'Orthographic'].forEach(p => projection.option(p));
        projection.parent('#projectionParent');
        projection.changed(() => settings.projectionType = projection.elt.selectedIndex);

        const view = p.createSelect(); // Using select resulted in a p5 error
        ['Front', 'Side', 'Use Mouse'].forEach(v => view.option(v));
        view.parent('#viewParent');
        view.changed(() => settings.view = view.elt.selectedIndex);

        const passengerLoad = p.createSelect(); // Using select resulted in a p5 error
        passengerLoadTypes.forEach(o => passengerLoad.option(o));
        passengerLoad.parent('#passengerLoadParent');
        passengerLoad.changed(() => settings.passengerLoad = passengerLoad.elt.selectedIndex);
    }

    p.setup = function() {
        p.createCanvas(600, canvasWidth, p.WEBGL).parent('main');
        p.numFloors = Math.floor(p.height / settings.geom.storyHeight);
        p.textFont(font);
        p.textAlign(p.CENTER, p.CENTER);

        createKnobs();
    };

    p.mouseMoved = function() {
        mouseHasMoved = true;
    };

    function setCameraBasedOnAvgCarHeight() {
        const avgCarY = cars.map(car => car.y).reduce((a, b) => a + b, 0) / cars.length;
        p.camera(0, -avgCarY, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0); // Most args are defaults
    }

    p.draw = function() {
        if (settings.projectionType === 1)
            p.ortho();
        else {
            p.perspective();
            setCameraBasedOnAvgCarHeight();
        }
        let rotY = 0;
        if (settings.view === 1) rotY = -p.TAU / 4;
        else if (settings.view === 2 && mouseHasMoved) rotY = p.map(p.mouseX, 0, p.width, -p.TAU / 8, p.TAU / 8);
        p.rotateY(rotY);
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
