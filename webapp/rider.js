export default class Rider {
    constructor(p, startFloor, destFloor, cars) {
        this.p = p;
        this.carDims = cars[0].carDims;
        this.STATE_ARRIVING = 1;
        this.STATE_WAITING = 2;
        this.STATE_BOARDING = 3;
        this.STATE_RIDING = 4;
        this.STATE_EXITING = 5;
        this.STATE_EXITED = 6;
        this.floor = startFloor;
        this.destFloor = destFloor;
        this.cars = cars;
        this.height = p.randomGaussian(cars[0].carDims.height / 2, 2);
        this.width = p.randomGaussian(this.height / 4, 2);
        this.pos = p.createVector(0, p.yFromFloor(this.floor), this.randomFloorZ());
        this.waitPos = p.createVector(p.width * 0.2 + p.randomGaussian(p.width / 8, p.width / 10), this.pos.y, this.pos.z);
        this.state = this.STATE_ARRIVING;
        this.carIn = undefined;
        console.log(`Rider on ${startFloor} going to ${destFloor}`);
        this.color = [p.random(255), p.random(255), p.random(255)];
    }

    randomFloorZ() {
        const p = this.p;
        return p.map(p.random(1), 0, 1, -20, 20);
    }

    update() {
        const p = this.p;
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
                const openCar = this.cars.find(car => car.state === car.STATE_OPEN && car.y === p.yFromFloor(this.floor));
                if (openCar) {
                    const dx = this.carDims.width * 0.4;
                    const dz = this.carDims.depth * 0.4;
                    const carEnterPos = p.createVector(openCar.carCenterX(), this.pos.y, openCar.carCenterZ() + this.carDims.depth);
                    const carPos = p.createVector(openCar.carCenterX() + p.map(p.random(1), 0, 1, -dx, dx), this.pos.y,
                        openCar.carCenterZ() + p.map(p.random(1), 0, 1, -dz, dz));
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
                if (this.carIn.state === this.carIn.STATE_OPEN && this.carIn.y === p.yFromFloor(this.destFloor)) {
                    this.state = this.STATE_EXITING;
                    this.exitZ = this.randomFloorZ();
                }
                break;
            case this.STATE_EXITING:
                if (this.pos.z < this.exitZ) {
                    this.pos.z += 3;
                } else {
                    this.pos.x += STEP_SPEED;
                    if (this.pos.x >= p.width * 0.9) {
                        this.state = this.STATE_EXITED;
                    }
                }
                break;
        }
    }

    draw() {
        if (this.state === this.STATE_EXITED) return;

        const p = this.p;
        p.push();
        p.translate(this.pos.x, this.pos.y, this.pos.z);
        const fadeThreshold = 0.8;
        const arrivingFadeThreshold = 1 - fadeThreshold;
        const maxAlpha = 200;
        let alpha = maxAlpha;
        if (this.state === this.STATE_ARRIVING && this.pos.x < p.width * arrivingFadeThreshold) {
            alpha = p.map(this.pos.x, 0, p.width * arrivingFadeThreshold, 0, maxAlpha);
        } else if (this.state === this.STATE_EXITING && this.pos.x > p.width * fadeThreshold) {
            alpha = p.map(this.pos.x, p.width * fadeThreshold, p.width, maxAlpha, 0);
        }
        p.push();
        const legLength = 4;
        p.translate(0, this.height / 2 + legLength, 0);
        p.stroke(128, alpha);
        p.fill(this.color[0], this.color[1], this.color[2], alpha);
        p.ellipsoid(this.width / 2, this.height / 2, this.width / 2);
        p.pop();

        if (this.state !== this.STATE_EXITING) { // Skip number when on target floor and leaving
            p.fill(0, alpha);
            p.stroke(0, alpha);
            p.translate(0, this.height * 2, 0);
            p.textSize(12);
            p.scale(1, -1, 1);  // Otherwise text is upside-down
            p.text(this.destFloor, 0, 0);
        }
        p.pop();
    }
}
