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
        this.height = randomGaussian(10, 2);
        this.width  = randomGaussian(5, 2);
        this.pos = createVector(0, yFromFloor(this.floor), this.randomFloorZ());
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
        const STEP_SPEED = 8;
        switch (this.state) {
            case this.STATE_ARRIVING:
                const xArrivingLeft = this.waitPos.x - this.pos.x;
                if (xArrivingLeft > 0) {
                    this.pos.x += Math.min(STEP_SPEED, xArrivingLeft);
                } else {
                    this.state = this.STATE_WAITING;
                }
                break;
            case this.STATE_WAITING:
                const openCar = this.cars.find(car => car.state === car.STATE_OPEN && car.y === yFromFloor(this.floor));
                if (openCar) {
                    const dx = CAR_DIMS.width * 0.4;
                    const dz = CAR_DIMS.depth * 0.4;
                    const carEnterPos = createVector(openCar.carCenterX(), this.pos.y, openCar.carCenterZ() + CAR_DIMS.depth);
                    const carPos = createVector(openCar.carCenterX() + map(random(1), 0, 1, -dx, dx), this.pos.y,
                        openCar.carCenterZ() + map(random(1), 0, 1, -dz, dz));
                    this.path = [carEnterPos, carPos];
                    this.state = this.STATE_BOARDING;
                    this.carIn = openCar;
                    this.carIn.goTo(this.destFloor);
                }
                break;
            case this.STATE_BOARDING:
                const dest = this.path[0];
                const pointerToDest = p5.Vector.sub(dest, this.pos);
                const distToDest = pointerToDest.mag();
                const step = p5.Vector.mult(pointerToDest.normalize(), Math.min(distToDest, STEP_SPEED));
                this.pos.add(step);
                if (distToDest <= STEP_SPEED) {
                    this.path.shift();
                    if (this.path.length === 0) {
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
                    this.pos.x += STEP_SPEED;
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
        translate(this.pos.x, this.pos.y, this.pos.z);
        const fadeThreshold = 0.8;
        const arrivingFadeThreshold = 1 - fadeThreshold;
        const maxAlpha = 200;
        let alpha = maxAlpha;
        if (this.state === this.STATE_ARRIVING && this.pos.x < width * arrivingFadeThreshold) {
            alpha = map(this.pos.x, 0, width * arrivingFadeThreshold, 0, maxAlpha);
        } else if (this.state === this.STATE_EXITING && this.pos.x > width * fadeThreshold) {
            alpha = map(this.pos.x, width * fadeThreshold, width, maxAlpha, 0);
        }
        push();
        const legLength = 4;
        translate(0, this.height / 2 + legLength, 0);
        noStroke();
        fill(150, alpha);
        ellipsoid(this.width, this.height, this.width);
        pop();

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
        translate(0, this.height * 3, 0);
        textSize(14);
        scale(1, -1, 1);  // Otherwise text is upside-down
        text(this.destFloor, 0, 0);
        pop();
    }
}
