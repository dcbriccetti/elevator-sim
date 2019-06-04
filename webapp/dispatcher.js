import Rider from './rider.js'

/** Implements a simplistic first-come, first-served passenger delivery scheme. */
export default class Dispatcher {
    constructor(p, settings, cars) {
        this.p = p;
        this.settings = settings;
        this.cars = cars;
        this.queue = [];
        this.riders = [];
    }

    call(floor) {
        if (! this.queue.find(el => el === floor)) {
            this.queue.push(floor);
        }
    }

    process(cars) {
        this.processRiders();
        const floor = this.queue.shift();

        if (floor) {
            const floorY = this.p.yFromFloor(floor);
            const idleCars = cars.filter(car => car.state === car.STATE_IDLE);
            const dist = car => Math.abs(car.y - floorY);
            const closestIdle = idleCars.reduce((a, b) => a && b ? dist(a) > dist(b) ? b : a : b, undefined);
            if (closestIdle) {
                closestIdle.goTo(floor);
            }
        }
    }

    processRiders() {
        this.riders.forEach(rider => {
            rider.update();
            rider.draw();
        });

        this.riders = this.riders.filter(rider => rider.state !== rider.STATE_EXITED);
        this.possiblySpawnNewRider();
    }

    possiblySpawnNewRider() {
        const p = this.p;
        function randomFloor() {
            return p.random(1) < 0.5 ? 1 : Math.floor(p.random(p.numFloors) + 1);
        }

        const load = this.settings.passengerLoad;
        const desiredPerMin = load === 0 ? // Varying
            p.map(p.sin(p.millis() / 1e5), -1, 1, 10, 60) :
            Math.pow(5, load - 1);
        const desiredPerSec = desiredPerMin / 60;
        const spawnChance = Math.min(1, desiredPerSec / p.frameRate());

        if (p.random(1) < spawnChance) {
            const start = randomFloor();
            let end = randomFloor();
            while (start === end) {
                end = randomFloor();
            }
            this.riders.push(new Rider(p, start, end, this.cars));
            this.call(start);
        }
    }
}
