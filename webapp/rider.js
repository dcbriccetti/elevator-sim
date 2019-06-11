export default class Rider {
    constructor(p, startFloor, destFloor, cars, stats) {
        this.p = p;
        this.startFloor = startFloor;
        this.destFloor = destFloor;
        this.cars = cars;
        this.stats = stats;
        this.createStates();
        this.state = this.STATE_ARRIVING;
        this.carDims = cars[0].settings.geom.car;
        this.height = p.randomGaussian(this.carDims.y / 2, 4);
        this.width = Math.max(6, p.randomGaussian(this.height / 4, 4));
        const neg1IfComingFromRight = this.randomDirection();
        const enterX = p.width / 2 - neg1IfComingFromRight * p.width / 2;
        this.pos = p.createVector(enterX, p.yFromFloor(this.startFloor), this.randomFloorZ());
        const waitX = enterX + neg1IfComingFromRight * p.randomGaussian(p.width / 4, p.width / 10);
        this.waitPos = p.createVector(waitX, this.pos.y, this.pos.z);
        this.arrivingPath = [this.waitPos];
        this.carIn = undefined;
        this.color = [p.random(255), p.random(255), p.random(255)];
        this.movementPerMs = p.randomGaussian(300, 50) / 1000;
        this.destNumberDisplay = this.setUpDestNumberDisplay(p);
        ++this.stats.riders.waiting;
    }

    createStates() {
        this.STATE_ARRIVING = 1;
        this.STATE_WAITING  = 2;
        this.STATE_BOARDING = 3;
        this.STATE_RIDING   = 4;
        this.STATE_EXITING  = 5;
        this.STATE_EXITED   = 6;
    }

    randomDirection() {
        return this.p.random(1) < 0.5 ? -1 : 1;
    }

    randomFloorZ() {
        return this.p.map(this.p.random(1), 0, 1, -20, 20);
    }

    update() {
        switch (this.state) {
            case this.STATE_ARRIVING:
                this.followPath(this.arrivingPath, this.STATE_WAITING);
                break;
            case this.STATE_WAITING:
                this.waitForCar();
                break;
            case this.STATE_BOARDING:
                this.followPath(this.boardingPath, this.STATE_RIDING, () => {
                    --this.stats.riders.waiting;
                    ++this.stats.riders.riding;
                });
                break;
            case this.STATE_RIDING:
                this.ride();
                break;
            case this.STATE_EXITING:
                this.followPath(this.exitingPath, this.STATE_EXITED);
                break;
        }
    }

    waitForCar() {
        const yThisFloor = this.p.yFromFloor(this.startFloor);
        const openCar = this.cars.find(car => car.state === car.STATE_OPEN && car.y === yThisFloor);
        if (openCar) {
            this.carIn = openCar;
            this.carIn.goTo(this.destFloor);
            this.setBoardingPath(openCar);
            this.millisAtLastMove = this.p.millis();
            this.state = this.STATE_BOARDING;
        }
    }

    outsideDoorPos(openCar) {
        return this.p.createVector(openCar.carCenterX() + this.fuzz(2),
            this.pos.y, openCar.settings.geom.carCenterZ + this.carDims.z + this.fuzz(2));
    }

    ride() {
        const car = this.carIn;
        this.pos.y = car.y;
        if (car.state === car.STATE_OPEN && car.y === this.p.yFromFloor(this.destFloor)) {
            this.setExitingPath(car);
            this.millisAtLastMove = this.p.millis();
            --this.stats.riders.riding;
            ++this.stats.riders.served;
            this.state = this.STATE_EXITING;
        }
    }

    setBoardingPath(car) {
        const cd = this.carDims;
        const insideCar = this.p.createVector(car.carCenterX() + this.fuzz(cd.x * 0.4), this.pos.y,
            car.settings.geom.carCenterZ + this.fuzz(cd.z * 0.4));
        this.boardingPath = [this.outsideDoorPos(car), insideCar];
    }

    setExitingPath(car) {
        const p = this.p;
        const nearDoorInsideCar = p.createVector(car.carCenterX() + this.fuzz(2), this.pos.y,
            car.settings.geom.carCenterZ + this.carDims.z / 2 - 5 + this.fuzz(2));
        const outsideDoor = this.outsideDoorPos(car);
        const exitPoint = p.createVector(p.width / 2 - this.randomDirection() * p.width / 2,
            this.pos.y, this.randomFloorZ());
        this.exitingPath = [nearDoorInsideCar, outsideDoor, exitPoint];
    }

    fuzz(half) {
        return this.p.map(this.p.random(1), 0, 1, -half, half);
    }

    followPath(path, nextState, onComplete) {
        const distanceToDestination = this.moveToward(path[0]);
        if (distanceToDestination === 0) {
            path.shift();
            if (! path.length) {
                this.state = nextState;
                if (onComplete) onComplete();
            }
        }
    }

    moveToward(dest) {
        const now = this.p.millis();
        const millisSinceLastStep = now - (this.millisAtLastMove || now);
        this.millisAtLastMove = now;
        const pointerToDest = p5.Vector.sub(dest, this.pos);
        const distToDest = pointerToDest.mag();
        const step = p5.Vector.mult(pointerToDest.normalize(), Math.min(distToDest, this.movementPerMs * millisSinceLastStep));
        this.pos.add(step);
        return p5.Vector.sub(dest, this.pos).mag();
    }

    draw() {
        if (this.state === this.STATE_EXITED) return;

        const p = this.p;
        p.pushed(() => {
            p.translate(this.pos.x, this.pos.y, this.pos.z);
            p.pushed(() => {
                const legLength = 4;
                p.translate(0, this.height / 2 + legLength, 0);
                p.noStroke();
                p.fill(this.color[0], this.color[1], this.color[2]);
                p.ellipsoid(this.width / 2, this.height / 2, this.width / 2);
            });

            p.pushed(() => {
                p.translate(0, this.height * 1.7, 0);
                p.scale(0.5, -0.5, 1);  // Fix upside-down and shrink for better quality
                p.texture(this.destNumberDisplay);
                p.noStroke();
                p.plane(25);
            });
        });
    }

    setUpDestNumberDisplay(p) {
        const pg = p.createGraphics(25, 25);
        pg.stroke(100);
        pg.fill(100);
        pg.textFont('sans-serif', 24);
        pg.textAlign(p.CENTER);
        pg.text(this.destFloor, 12, 25);
        return pg;
    }
}
