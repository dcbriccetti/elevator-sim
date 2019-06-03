class Dispatcher {
    constructor() {
        this.queue = [];
        this. riders = [];
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
            const floorY = yFromFloor(floor);
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

        const spawnProb1InN  = map(sin(millis() / 1e5), -1, 1, 150, 5);
        if (random(spawnProb1InN) < 1) {
            const start = randomFloor();
            let end = randomFloor();
            while (start === end) {
                end = randomFloor();
            }
            this.riders.push(new Rider(start, end, cars));
        }
        this.riders = this.riders.filter(rider => rider.state !== rider.STATE_EXITED);
    }
}
