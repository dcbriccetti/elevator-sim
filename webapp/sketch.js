import Controls from './controls.js'
import Building from './building.js'
import Dispatcher from './dispatcher.js'
import Car from './car.js'
import Stats from './stats.js'
import Talker from './talker.js'

new p5(p => {
    const passengerLoadTypes =
        ['Varying', 'Very Light', 'Light', 'Moderate', 'Heavy', 'Very Heavy', 'Insane'];

    function createSettings() {
        const car = p.createVector(1, 1, 1.3).mult(50);
        const floorDepthOthers = 50;
        return {
            numCars: 8,
            doorMovementSecs: 0.4,
            doorOpenMs: 2500,
            maxRidersPerCar: 25,
            numActiveCars: 0,
            geom: {
                scaleMetersTo3dUnits: 16,  // Some objects are defined with metric dimensions
                car: car,
                carCenterZ: -car.z / 2 - floorDepthOthers / 2,
                storyHeight: car.y * 1.7,
                floorDepthGround: floorDepthOthers * 2,
                floorDepthOthers: floorDepthOthers,
            },
            controlMode: 0, // Auto
            elevSpeed: 5,
            view: 0,
            passengerLoad: 0,
            passengerLoadNumManualLevels: passengerLoadTypes.length - 1, // The first is not manual
            volume: 0,
            speakersType: 0,
        };
    }

    const settings = createSettings();
    let mouseHasMoved = false;

    p.yFromFloor = floor => settings.geom.storyHeight * (floor - 1);
    p.floorFromY = y => Math.round(y / settings.geom.storyHeight + 1);
    let controls;
    let cars;
    let building;
    let stats;
    let dispatcher;
    let talker;
    let ready = false;

    p.preload = function() {
        p.dingSound = p.loadSound('assets/ding.wav');
    };

    p.setup = function() {
        const cg = settings.geom;
        setCanvasSize();
        p.createCanvas(cg.canvas.x, cg.canvas.y, p.WEBGL).parent('main');
        settings.numFloors = Math.floor(p.height / settings.geom.storyHeight);
        stats = new Stats();
        controls = new Controls(p, settings, stats);
        talker = {speakRandom: (a, b, c) => {}}; // Temporary dummy talker for Safari
        talker = new Talker(settings, (voiceNames, englishVoiceNames) => {
            cars = Array.from(Array(settings.numCars).keys(), n => new Car(p, settings, stats, n + 1,
                talker, englishVoiceNames[n % englishVoiceNames.length]));
            building = new Building(settings, cars);
            dispatcher = new Dispatcher(p, settings, cars, stats, talker);
            controls.createKnobs(passengerLoadTypes);
            controls.activeCarsChange = () => dispatcher.updateCarActiveStatuses();
            controls.volumeChange = v => talker.volume(v);
            ready = true;
        });
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

    function manuallySummon() {
        if (settings.controlMode === 1 && p.mouseX >= 0 && p.mouseY >= 0) {
            const dist = car => Math.abs(car.carCenterX() - p.mouseX);
            const car = dispatcher.activeCars().reduce((a, b) => a && b ? dist(a) > dist(b) ? b : a : b, undefined);
            if (car) {
                const y = p.height - p.mouseY;
                car.goTo(p.floorFromY(y), true);
            }
        }
    }

    p.mousePressed = function() {
        manuallySummon();
    };

    p.mouseDragged = function() {
        manuallySummon();
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
        const now = p.millis() / 1000;
        const waitingRiders = dispatcher.riders.filter(r => r.state === r.STATE_WAITING);
        const waitSecs = waitingRiders.reduce((accum, rider) => (now - rider.arrivalTime) + accum, 0);
        const wait = s.waiting ? ` (${l(Math.round(waitSecs))} secs)` : '';
        const profit = s.payments - stats.costs.operating;
        $('#score').html(l(Math.round(Math.max(0, profit / (p.millis() / 1000 / 60)))));
        $('#waiting').html(`${l(s.waiting)}${wait}`);
        const weight = s.riding ? ` (${l(s.ridingKg / 1000)} Mg)` : '';
        $('#riding').html(`${l(s.riding)}${weight}`);
        $('#served').html(l(s.served));
        const curStyle = {style: 'currency', currency: 'usd'};
        $('#payments').html(s.payments.toLocaleString('en-us', curStyle));
        $('#costs').html(stats.costs.operating.toLocaleString('en-us', curStyle));
        $('#profit').html((profit).toLocaleString('en-us', curStyle));
        const g = controls.paymentsChart;
        const yScale = g.height / stats.normalRideCost;
        stats.recentRiderPayments.forEach((a, i) => {
            const rideCost = a * yScale;
            g.stroke('white');
            g.line(i, 0, i, g.height);
            g.stroke('gray');
            g.line(i, g.height - rideCost, i, g.height);
        });
    }

    function setUpCamera() {
        function setDefault() {
            p.camera(0, 0, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
        }

        if (settings.projectionType === 1) {
            p.ortho();
            setDefault();
        } else {
            p.perspective();
            if (settings.controlMode === 0 /* Auto */) {
                const avgCarY = cars.map(car => car.y).reduce((a, b) => a + b, 0) / cars.length;
                p.camera(0, -avgCarY, (p.height / 2.0) / p.tan(p.PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
            } else setDefault();
        }
    }

    let lastDrawTimeSecs = p.millis() / 1000;

    p.draw = function () {
        if (! ready) return;
        const now = (p.millis() / 1000);
        const timeSinceLastDrawSecs = now - lastDrawTimeSecs;
        lastDrawTimeSecs = now;
        stats.addIdleCosts(timeSinceLastDrawSecs, settings.numActiveCars);
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
            dispatcher.process();
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
