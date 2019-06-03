class Rider {
    constructor(startFloor, destFloor, cars) {
        this.STATE_ARRIVING = 1;
        this.STATE_WAITING = 2;
        this.STATE_BOARDING = 3;
        this.STATE_RIDING = 4;
        this.STATE_EXITING = 5;
        this.STATE_EXITED = 6;
        this.floor = startFloor;
        this.destFloor = destFloor;
        this.cars = cars;
        this.height = 10;
        this.pos = createVector(0, yFromFloor(this.floor) + this.height, this.randomFloorZ());
        this.waitPos = createVector(width * 0.2 + randomGaussian(width / 8, width / 10), this.pos.y, this.pos.z);
        this.state = this.STATE_ARRIVING;
        this.carIn = undefined;
        console.log(`Rider on ${startFloor} going to ${destFloor}`);
        dispatcher.call(this.floor);
    }

    randomFloorZ() {
        return map(random(1), 0, 1, -20, 20);
    }

    update() {
        switch (this.state) {
            case this.STATE_ARRIVING:
                const xArrivingLeft = this.waitPos.x - this.pos.x;
                if (xArrivingLeft > 0) {
                    this.pos.x += Math.min(10, xArrivingLeft);
                } else {
                    this.state = this.STATE_WAITING;
                }
                break;
            case this.STATE_WAITING:
                const openCar = this.cars.find(car => car.state === car.STATE_OPEN && car.y === yFromFloor(this.floor));
                if (openCar) {
                    const dx = CAR_DIMS.width * 0.4;
                    const dz = CAR_DIMS.depth * 0.4;
                    this.carPos = createVector(openCar.carCenterX() + map(random(1), 0, 1, -dx, dx), this.pos.y,
                        openCar.carCenterZ() + map(random(1), 0, 1, -dz, dz));
                    this.state = this.STATE_BOARDING;
                    this.carIn = openCar;
                    this.carIn.goTo(this.destFloor);
                }
                break;
            case this.STATE_BOARDING:
                const xBoardingRemaining = this.pos.x - this.carPos.x;
                if (Math.abs(xBoardingRemaining) > 0) {
                    const sign = xBoardingRemaining < 0 ? 1 : -1;
                    this.pos.x += sign * Math.min(10, Math.abs(xBoardingRemaining));
                } else {
                    const zLeft = this.pos.z - this.carPos.z;
                    const sign = zLeft < 0 ? 1 : -1;
                    if (zLeft > 0) {
                        this.pos.z += sign * Math.min(3, zLeft);
                    } else {
                        this.state = this.STATE_RIDING;
                    }
                }
                break;
            case this.STATE_RIDING:
                this.pos.y = this.carIn.y;
                if (this.carIn.state === this.carIn.STATE_OPEN && this.carIn.y === yFromFloor(this.destFloor)) {
                    this.state = this.STATE_EXITING;
                    this.exitZ = this.randomFloorZ();
                }
                break;
            case this.STATE_EXITING:
                if (this.pos.z < this.exitZ) {
                    this.pos.z += 3;
                } else {
                    this.pos.x += 10;
                    if (this.pos.x >= width * 0.9) {
                        this.state = this.STATE_EXITED;
                    }
                }
                break;
        }
    }

    draw() {
        if (this.state === this.STATE_EXITED) return;

        push();
        translate(this.pos.x, this.pos.y + this.height, this.pos.z);
        scale(1, -1, 1);  // Otherwise text is upside-down
        const fadeThreshold = 0.8;
        const arrivingFadeThreshold = 1 - fadeThreshold;
        const maxAlpha = 200;
        let alpha = maxAlpha;
        if (this.state === this.STATE_ARRIVING && this.pos.x < width * arrivingFadeThreshold) {
            alpha = map(this.pos.x, 0, width * arrivingFadeThreshold, 0, maxAlpha);
        } else if (this.state === this.STATE_EXITING && this.pos.x > width * fadeThreshold) {
            alpha = map(this.pos.x, width * fadeThreshold, width, maxAlpha, 0);
        }
        noFill();
        stroke(0, 64);
        box(12, 20, 5);

        if (this.state === this.STATE_EXITING) {
            fill(0, 150, 0, alpha);
            stroke(0, 150, 0, alpha);
        } else if (this.state === this.STATE_ARRIVING || this.state === this.STATE_WAITING) {
            fill(255, 0, 0, alpha);
            stroke(255, 0, 0, alpha);
        } else {
            fill(0, alpha);
            stroke(0, alpha);
        }
        textSize(14);
        text(this.destFloor, 0, 0);
        pop();
    }
}
