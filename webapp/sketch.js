import Dispatcher from './dispatcher.js'
import Car from './car.js'
import Stats from './stats.js'

new p5(p => {
    function createSettings() {
        const car = p.createVector(1, 1, 1.5).mult(50);
        const floorDepthOthers = 50;
        return {
            numCars: 5,
            geom: {
                canvas: p.createVector(600, 1000),
                car: car,
                carCenterZ: -car.z / 2 - floorDepthOthers / 2,
                storyHeight: car.y * 1.7,
                floorDepthGround: floorDepthOthers * 2,
                floorDepthOthers: floorDepthOthers,
            },
            elevSpeed: 5,
            view: 0,
            passengerLoad: 0,
            volume: 0,
        };
    }

    const settings = createSettings();
    const passengerLoadTypes = ['Varying', 'Very Light', 'Light', 'Moderate', 'Heavy', 'Very Heavy', 'Insane'];
    settings.passengerLoadNumManualLevels = passengerLoadTypes.length - 1; // The first is not manual
    let mouseHasMoved = false;

    p.yFromFloor = function(floor) {
        return settings.geom.storyHeight * (floor - 1);
    };
    const cars = Array.from(Array(settings.numCars).keys(), n => new Car(p, settings, n + 1));
    const stats = new Stats();
    const dispatcher = new Dispatcher(p, settings, cars, stats);

    function createKnobs() {
        const elevSpeed = p.select('#elevSpeed');
        elevSpeed.value(settings.elevSpeed);
        elevSpeed.changed(() => settings.elevSpeed = elevSpeed.value());

        const volume = p.select('#volume');
        volume.value(settings.volume);
        volume.changed(() => {
            if (p.getAudioContext().state !== 'running') {  // todo Is this required?
              p.getAudioContext().resume();
            }
            settings.volume = volume.value();
            p.dingSound.setVolume(volume.value() / 500);  // It’s much louder than the motors
        });

        const projection = p.createSelect();
        ['Perspective', 'Orthographic'].forEach(p => projection.option(p));
        projection.parent('#projectionParent');
        projection.changed(() => settings.projectionType = projection.elt.selectedIndex);

        const view = p.createSelect();
        ['Front', 'Side', 'Use Mouse'].forEach(v => view.option(v));
        view.parent('#viewParent');
        view.changed(() => settings.view = view.elt.selectedIndex);

        const passengerLoad = p.createSelect();
        passengerLoadTypes.forEach(o => passengerLoad.option(o));
        passengerLoad.parent('#passengerLoadParent');
        passengerLoad.changed(() => settings.passengerLoad = passengerLoad.elt.selectedIndex);
    }

    p.preload = function() {
        p.dingSound = p.loadSound('assets/ding.wav');
    };

    p.setup = function() {
        const gc = settings.geom.canvas;
        p.createCanvas(gc.x, gc.y, p.WEBGL).parent('main');
        p.numFloors = Math.floor(p.height / settings.geom.storyHeight);
        createKnobs();
    };

    p.mouseMoved = function() {
        mouseHasMoved = true;
    };

    p.pushed = function(block) {
        p.push();
        block();
        p.pop();
    };

    function setCameraBasedOnAvgCarHeight() {
        const avgCarY = cars.map(car => car.y).reduce((a, b) => a + b, 0) / cars.length;
        p.camera(0, -avgCarY, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0); // Most args are defaults
    }

    function setDefaultCamera() {
        p.camera(0, 0, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
    }

    function rotateOnY() {
        let rotY = 0;
        if (settings.view === 1) rotY = -p.TAU / 4;
        else if (settings.view === 2 && mouseHasMoved) rotY = p.map(p.mouseX, 0, p.width, -p.TAU / 8, p.TAU / 8);
        p.rotateY(rotY);
    }

    p.draw = function () {
        let lastRiderStats = undefined;
        const s = stats.riders;
        if (s !== lastRiderStats) {
            lastRiderStats = s;
            const l = s => s.toLocaleString();
            document.getElementById('riderCounts').textContent = `Waiting: ${l(s.waiting)}, Riding: ${l(s.riding)}, Served: ${l(s.served)}`;
        }
        p.background(240);
        if (settings.projectionType === 1) {
            p.ortho();
            setDefaultCamera();
        } else {
            p.perspective();
            setCameraBasedOnAvgCarHeight();
        }
        rotateOnY();
        inQuadrant1(() => {
            cars.forEach(car => {
                car.update();
                car.draw();
            });
            drawFloors();
            dispatcher.process(cars);
        });
    };

    function drawFloors() {
        p.noStroke();
        p.fill(0, 0, 100, 20);
        for (let floor = 1; floor <= p.numFloors; ++floor) {
            const floorY = p.yFromFloor(floor);
            p.pushed(() => {
                const floorHeight = 4;
                p.translate(p.width / 2, floorY - floorHeight / 2,
                    floor === 1 ? -settings.geom.floorDepthOthers / 2 : 0);
                p.box(p.width, floorHeight,
                    floor === 1 ? settings.geom.floorDepthGround : settings.geom.floorDepthOthers);
            });
            cars.forEach(car => {
                p.pushed(() => {
                    const gc = settings.geom.car;
                    const indHeight = gc.y / 3;
                    p.translate(car.carCenterX(), floorY + gc.y + indHeight / 2,
                        settings.geom.carCenterZ + gc.z / 2);
                    p.noStroke();
                    const carReady = floorY === car.y && (car.state === car.STATE_OPENING || car.state === car.STATE_OPEN);
                    if (carReady) {
                        p.stroke(125, 84);
                        p.fill(255, 248);
                        p.plane(14, indHeight);
                        const downArrow = (! car.movingUp && floor !== 1) || floor === p.numFloors;
                        p.noStroke();
                        p.fill('green');
                        downArrow ?
                            p.triangle(0, -4, -4,  5, 4,  5) :
                            p.triangle(0,  5, -4, -4, 4, -4);
                    }
                });
            });
        }
    }

    /** Places the origin at the bottom left, and makes y increase going up. */
    function inQuadrant1(block) {
        p.push();
        p.translate(-p.width / 2, p.height / 2, 0);
        p.scale(1, -1, 1);
        block();
        p.pop();
    }
});
