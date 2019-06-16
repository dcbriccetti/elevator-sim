import Rider from './rider.js'

/** Manages riders, and calls elevators for them. */
export default class Dispatcher {
    constructor(p, settings, cars, stats) {
        this.p = p;
        this.settings = settings;
        this.cars = cars;
        this.stats = stats;
        this.carCallQueue = [];
        this.riders = [];
    }

    requestCar(floor, goingUp) {
        if (! this.carCallQueue.find(request => request.floor === floor && request.goingUp === goingUp)) {
            this.carCallQueue.push({floor: floor, goingUp: goingUp});
        }
    }

    process() {
        this.processRiders();
        const request = this.carCallQueue.shift();

        if (request) {
            const floorY = this.p.yFromFloor(request.floor);
            const activeCars = this.cars.slice(0, this.settings.numActiveCars);
            const idleCars = activeCars.filter(car => car.state === car.STATE_IDLE && car.goingUp === request.goingUp);
            const dist = car => Math.abs(car.y - floorY);
            const closest = cars => cars.reduce((a, b) => a && b ? dist(a) > dist(b) ? b : a : b, undefined);
            const closestIdleActiveCar = closest(idleCars);
            if (closestIdleActiveCar) {
                closestIdleActiveCar.goTo(request.floor);
            } else {
                const closestActiveCar = closest(activeCars);
                if (closestActiveCar)
                    closestActiveCar.goTo(request.floor);
                else this.carCallQueue.push(request);
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
        const randomFloor = () => p.random(1) < 0.5 ? 1 : Math.floor(p.random(this.settings.numFloors) + 1);
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
            this.riders.push(new Rider(p, this.settings, start, end, this, this.cars, this.stats));
        }
    }
}
