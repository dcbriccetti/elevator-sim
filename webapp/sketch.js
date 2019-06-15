import Controls from './controls.js'
import Building from './building.js'
import Dispatcher from './dispatcher.js'
import Car from './car.js'
import Stats from './stats.js'

new p5(p => {
    const passengerLoadTypes =
        ['Varying', 'Very Light', 'Light', 'Moderate', 'Heavy', 'Very Heavy', 'Insane'];

    function createSettings() {
        const car = p.createVector(1, 1, 1.5).mult(50);
        const floorDepthOthers = 50;
        return {
            numCars: 5,
            geom: {
                scaleMetersTo3dUnits: 16,  // Some objects are defined with metric dimensions
                car: car,
                carCenterZ: -car.z / 2 - floorDepthOthers / 2,
                storyHeight: car.y * 1.7,
                floorDepthGround: floorDepthOthers * 2,
                floorDepthOthers: floorDepthOthers,
            },
            elevSpeed: 5,
            view: 0,
            passengerLoad: 0,
            passengerLoadNumManualLevels: passengerLoadTypes.length - 1, // The first is not manual
            volume: 0,
        };
    }

    const settings = createSettings();
    let mouseHasMoved = false;

    p.yFromFloor = function(floor) {
        return settings.geom.storyHeight * (floor - 1);
    };
    let controls;
    let cars;
    let building;
    let stats;
    let dispatcher;

    p.preload = function() {
        p.dingSound = p.loadSound('assets/ding.wav');
    };

    p.setup = function() {
        const cg = settings.geom;
        setCanvasSize();
        p.createCanvas(cg.canvas.x, cg.canvas.y, p.WEBGL).parent('main');
        p.numFloors = Math.floor(p.height / settings.geom.storyHeight);
        controls = new Controls(p, settings);
        cars = Array.from(Array(settings.numCars).keys(), n => new Car(p, settings, n + 1));
        building = new Building(settings, cars);
        stats = new Stats();
        dispatcher = new Dispatcher(p, settings, cars, stats);
        controls.createKnobs(passengerLoadTypes);
    };

    function setCanvasSize() {
        const m = $('#main');
        settings.geom.canvas = p.createVector(m.width() * 0.95, p.windowHeight * 0.92);  // todo Remove these magic numbers
    }

    p.windowResized = function() {
        setCanvasSize();
        p.resizeCanvas(settings.geom.canvas.x, settings.geom.canvas.y);
    };

    p.mouseMoved = function() {
        mouseHasMoved = true;
    };

    p.pushed = function(block) {
        p.push();
        block();
        p.pop();
    };

    function rotateOnY() {
        let rotY = 0;
        if (settings.view === 1)
            rotY = -p.TAU / 4;
        else if (settings.view === 2 && mouseHasMoved)
            rotY = p.map(p.mouseX, 0, p.width, -p.TAU / 8, p.TAU / 8);
        p.rotateY(rotY);
    }

    function showRiderStats() {
        const s = stats.riders;
        const l = s => s.toLocaleString();
        const weight = s.riding ? ` (${l(s.ridingKg / 1000)} Mg)` : '';
        $('#waiting').html(l(s.waiting));
        $('#riding').html(`${l(s.riding)}${weight}`);
        $('#served').html(l(s.served));
    }

    function setUpCamera() {
        if (settings.projectionType === 1) {
            p.ortho();
            // Set default camera
            p.camera(0, 0, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
        } else {
            p.perspective();
            const avgCarY = cars.map(car => car.y).reduce((a, b) => a + b, 0) / cars.length;
            p.camera(0, -avgCarY, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
        }
    }

    p.draw = function () {
        showRiderStats();
        p.background(240);
        setUpCamera();
        rotateOnY();
        inQuadrant1(() => {
            cars.forEach(car => {
                car.update();
                car.draw();
            });
            building.drawFloors(p);
            dispatcher.process(cars);
        });
    };

    /** Places the origin at the bottom left, and makes y increase going up. */
    function inQuadrant1(block) {
        p.push();
        p.translate(-p.width / 2, p.height / 2, 0);
        p.scale(1, -1, 1);
        block();
        p.pop();
    }
});
