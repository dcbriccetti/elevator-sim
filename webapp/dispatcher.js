import Rider from './rider.js'

/** Manages riders, and calls elevators for them. */
export default class Dispatcher {
    constructor(p, settings, cars, stats, talker) {
        this.p = p;
        this.settings = settings;
        this.cars = cars;
        this.stats = stats;
        this.talker = talker;

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

        if (this.settings.controlMode === 0 /* Auto */) {
            const request = this.carCallQueue.shift();

            if (request) {
                const floorY = this.p.yFromFloor(request.floor);
                const activeCars = this.activeCars();
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
    }

    /** Returns an array of active cars, selected from the middle of the group, moving outward */
    activeCars() {
        if (this.settings.numActiveCars !== this.numActiveCarsInCache) {
            const carIndexes = [...Array(this.settings.numCars).keys()];
            const middleIndex = carIndexes[Math.floor(carIndexes.length / 2)];
            const distFromMiddle = i => Math.abs(i - middleIndex);
            carIndexes.sort((a, b) => distFromMiddle(a) - distFromMiddle(b));
            const activeCarIndexes = carIndexes.slice(0, this.settings.numActiveCars);
            this.cachedActiveCars = Array.from(activeCarIndexes, i => this.cars[i]);
            this.numActiveCarsInCache = this.settings.numActiveCars;
        }
        return this.cachedActiveCars;
    }

    isActive(car) {
        return this.activeCars().find(c => c === car) !== undefined;
    }

    updateCarActiveStatuses() {
        this.cars.forEach(car => car.active = this.isActive(car))
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
            this.riders.push(new Rider(p, this.settings, start, end, this, this.stats, this.talker));
        }
    }
}
