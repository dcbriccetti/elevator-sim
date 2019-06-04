export default class Rider {
    constructor(p, startFloor, destFloor, cars) {
        this.p = p;
        this.startFloor = startFloor;
        this.destFloor = destFloor;
        this.cars = cars;
        this.carDims = cars[0].settings.geom.car;
        console.log(`Rider on ${startFloor} going to ${destFloor}`);
        this.STATE_ARRIVING = 1;
        this.STATE_WAITING = 2;
        this.STATE_BOARDING = 3;
        this.STATE_RIDING = 4;
        this.STATE_EXITING = 5;
        this.STATE_EXITED = 6;
        this.height = p.randomGaussian(this.carDims.y / 2, 4);
        this.width = Math.max(6, p.randomGaussian(this.height / 4, 4));
        const neg1IfComingFromRight = this.randomDirection();
        const enterX = p.width / 2 - neg1IfComingFromRight * p.width / 2;
        this.pos = p.createVector(enterX, p.yFromFloor(this.startFloor), this.randomFloorZ());
        const waitX = enterX + neg1IfComingFromRight * p.randomGaussian(p.width / 4, p.width / 10);
        this.waitPos = p.createVector(waitX, this.pos.y, this.pos.z);
        this.state = this.STATE_ARRIVING;
        this.carIn = undefined;
        this.color = [p.random(255), p.random(255), p.random(255)];
        this.movementPerUpdate = p.constrain(p.randomGaussian(10, 5), 8, 20);
    }

    randomDirection() {
        return this.p.random(1) < 0.5 ? -1 : 1;
    }

    randomFloorZ() {
        const p = this.p;
        return p.map(p.random(1), 0, 1, -20, 20);
    }

    update() {
        const p = this.p;
        switch (this.state) {
            case this.STATE_ARRIVING:
                this.arrive();
                break;
            case this.STATE_WAITING:
                this.waitForCar(p);
                break;
            case this.STATE_BOARDING:
                this.followPath(this.boardingPath, this.STATE_RIDING);
                break;
            case this.STATE_RIDING:
                this.ride(p);
                break;
            case this.STATE_EXITING:
                this.followPath(this.exitingPath, this.STATE_EXITED);
                break;
        }
    }

    arrive() {
        const distToWaitPos = this.moveToward(this.waitPos);
        if (distToWaitPos < this.movementPerUpdate) {
            this.state = this.STATE_WAITING;
        }
    }

    waitForCar(p) {
        const openCar = this.cars.find(car => car.state === car.STATE_OPEN && car.y === p.yFromFloor(this.startFloor));
        if (openCar) {
            this.carIn = openCar;
            this.carIn.goTo(this.destFloor);
            const cd = this.carDims;
            const outsideDoor = this.outsideDoorPos(p, openCar, cd);
            const insideCar = p.createVector(openCar.carCenterX() + this.fuzz(cd.x * 0.4), this.pos.y,
                openCar.carCenterZ() + this.fuzz(cd.z * 0.4));
            this.boardingPath = [outsideDoor, insideCar];
            this.state = this.STATE_BOARDING;
        }
    }

    outsideDoorPos(p, openCar, cd) {
        return p.createVector(openCar.carCenterX() + this.fuzz(2),
            this.pos.y, openCar.carCenterZ() + cd.z + this.fuzz(2));
    }

    ride(p) {
        this.pos.y = this.carIn.y;
        if (this.carIn.state === this.carIn.STATE_OPEN && this.carIn.y === p.yFromFloor(this.destFloor)) {
            const cd = this.carDims;
            const nearDoorInsideCar = p.createVector(this.carIn.carCenterX() + this.fuzz(2), this.pos.y,
                this.carIn.carCenterZ() + cd.z / 2 - 5 + this.fuzz(2));
            const outsideDoor = this.outsideDoorPos(p, this.carIn, this.carDims);
            const exitPoint = p.createVector(p.width / 2 - this.randomDirection() * p.width / 2,
                this.pos.y, this.randomFloorZ());
            this.exitingPath = [nearDoorInsideCar, outsideDoor, exitPoint];
            this.state = this.STATE_EXITING;
        }
    }

    fuzz(half) {
        return this.p.map(this.p.random(1), 0, 1, -half, half);
    }

    followPath(path, nextState) {
        const dest = path[0];
        const distToDest = this.moveToward(dest);
        if (distToDest <= this.movementPerUpdate) {
            path.shift();
            if (path.length === 0) {
                this.state = nextState;
            }
        }
    }

    moveToward(dest) {
        const pointerToDest = p5.Vector.sub(dest, this.pos);
        const distToDest = pointerToDest.mag();
        const step = p5.Vector.mult(pointerToDest.normalize(), Math.min(distToDest, this.movementPerUpdate));
        this.pos.add(step);
        return distToDest;
    }

    draw() {
        if (this.state === this.STATE_EXITED) return;

        const p = this.p;
        p.push();
        p.translate(this.pos.x, this.pos.y, this.pos.z);
        let alpha = 200;
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
