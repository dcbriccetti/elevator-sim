/** Manages an elevator rider */
export default class Rider {
    constructor(p, settings, startFloor, destFloor, dispatcher, stats, talker) {
        this.p = p;
        this.settings = settings;
        this.startFloor = startFloor;
        this.destFloor = destFloor;
        this.dispatcher = dispatcher;
        this.stats = stats;
        this.talker = talker;

        this.createStates();
        this.state = this.STATE_ARRIVING;
        this.arrivalTime = p.millis() / 1000;
        this.carGeom = settings.geom.car;
        this.setBodyAttributes();
        const travelDirection = p.random([-1, 1]);
        const enterX = p.width / 2 - travelDirection * p.width / 2;
        this.pos = p.createVector(enterX, p.yFromFloor(startFloor), this.randomFloorZ());
        const waitX = enterX + travelDirection * p.randomGaussian(p.width / 3, p.width / 4);
        this.arrivingPath = [p.createVector(waitX, this.pos.y, this.pos.z)];
        this.carIn = undefined;
        this.color = [p.random(255), p.random(255), p.random(255)];
        this.movementPerMs = p.randomGaussian(300, 50) / 1000;
        this.destNumberDisplay = this.setUpDestNumberDisplay(p);
        ++stats.riders.waiting;
    }

    createStates() {
        this.STATE_ARRIVING = 1;
        this.STATE_WAITING  = 2;
        this.STATE_BOARDING = 3;
        this.STATE_RIDING   = 4;
        this.STATE_EXITING  = 5;
        this.STATE_EXITED   = 6;
    }

    setBodyAttributes() {
        const p = this.p;
        const meanHeight = 1.7;
        const meanWeight = 85;
        this.height = p.constrain(p.randomGaussian(meanHeight, 0.5), 1, 2.2);
        this.weight = p.constrain(p.randomGaussian(meanWeight, 10), 30, 150);
        const bmi = this.weight / (this.height * this.height);
        const bmiDiffLimit = 10;
        const normalBmiDiff = p.constrain(bmi - 25, -bmiDiffLimit, bmiDiffLimit);
        const widthMultiple = p.map(normalBmiDiff, -bmiDiffLimit, bmiDiffLimit, 0.7, 2.1);
        const normalWaistDiam = .90 / Math.PI; // d = circumference / π
        this.width = normalWaistDiam * widthMultiple;
    }

    randomFloorZ() {
        return this.p.lerp(-20, 20, this.p.random(1));
    }

    update() {
        const p = this.p;
        switch (this.state) {
            case this.STATE_ARRIVING:
                this.followPath(this.arrivingPath, this.STATE_WAITING, () => {
                    this.talker.speakRandom('arriving', undefined, 0.1);
                    this.requestCar()
                });
                break;
            case this.STATE_WAITING:
                this.waitForCar();
                break;
            case this.STATE_BOARDING:
                const canceled = this.followPath(this.boardingPath, this.STATE_RIDING, () => {
                    --this.stats.riders.waiting;
                    ++this.stats.riders.riding;
                    this.stats.riders.ridingKg += this.weight;
                }, () => this.carIn.state === this.carIn.STATE_OPEN);
                if (canceled) {
                    this.talker.speakRandom('tooLate', undefined, 1);
                    this.carIn.removeRider(this);
                    this.carIn = undefined;
                    this.requestCar();
                    this.state = this.STATE_WAITING;
                }
                break;
            case this.STATE_RIDING:
                this.ride();
                break;
            case this.STATE_EXITING:
                this.followPath(this.exitingPath, this.STATE_EXITED, () => {
                    const tripTime = p.millis() / 1000 - this.arrivalTime;
                    this.stats.chargeRider(p, tripTime);
                });
                break;
        }
    }

    requestCar() {
        this.dispatcher.requestCar(this.startFloor, this.destFloor > this.startFloor);
    }

    waitForCar() {
        const goingUp = this.destFloor > this.startFloor;
        const yThisFloor = this.p.yFromFloor(this.startFloor);
        let suitableExceptFullEncountered = false;
        const suitableCar = this.dispatcher.activeCars().find(car => {
            const allButRoom = car.state === car.STATE_OPEN && car.y === yThisFloor &&
                (this.settings.controlMode === 1 || car.goingUp === goingUp);
            if (allButRoom && ! car.hasRoom()) suitableExceptFullEncountered = true;
            return allButRoom && car.hasRoom();
        });
        if (suitableCar) {
            this.carIn = suitableCar;
            this.carIn.addRider(this);
            this.carIn.goTo(this.destFloor);
            this.setBoardingPath(suitableCar);
            this.millisAtLastMove = this.p.millis();
            this.state = this.STATE_BOARDING;
        } else if (suitableExceptFullEncountered) this.talker.speakRandom('carFull', undefined, 0.3);
    }

    outsideDoorPos(openCar) {
        return this.p.createVector(openCar.carCenterX() + this.fuzz(2),
            this.pos.y, openCar.settings.geom.carCenterZ + this.carGeom.z + this.fuzz(2));
    }

    ride() {
        const car = this.carIn;
        this.pos.y = car.y;
        if (car.state === car.STATE_OPEN && car.y === this.p.yFromFloor(this.destFloor)) {
            car.removeRider(this);
            this.setExitingPath(car);
            this.millisAtLastMove = this.p.millis();
            --this.stats.riders.riding;
            this.stats.riders.ridingKg -= this.weight;
            ++this.stats.riders.served;
            this.talker.speakRandom('leaving', undefined, 0.1);
            this.state = this.STATE_EXITING;
        }
    }

    setBoardingPath(car) {
        const cg = this.carGeom;
        const insideCar = this.p.createVector(car.carCenterX() + this.fuzz(cg.x * 0.4), this.pos.y,
            car.settings.geom.carCenterZ + this.fuzz(cg.z * 0.4));
        this.boardingPath = [this.outsideDoorPos(car), insideCar];
    }

    setExitingPath(car) {
        const p = this.p;
        const nearDoorInsideCar = p.createVector(car.carCenterX() + this.fuzz(2), this.pos.y,
            car.settings.geom.carCenterZ + this.carGeom.z / 2 - 5 + this.fuzz(2));
        const outsideDoor = this.outsideDoorPos(car);
        const exitPoint = p.createVector(p.width / 2 - this.p.random([-1, 1]) * p.width / 2,
            this.pos.y, this.randomFloorZ());
        this.exitingPath = [nearDoorInsideCar, outsideDoor, exitPoint];
    }

    fuzz(half) {
        return this.p.map(this.p.random(1), 0, 1, -half, half);
    }

    followPath(path, nextState, onComplete, continueWhile) {
        if (continueWhile && ! continueWhile()) return true;
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
        const stepMagnitude = Math.min(distToDest, this.movementPerMs * millisSinceLastStep);
        const step = p5.Vector.mult(pointerToDest.normalize(), stepMagnitude);
        this.pos.add(step);
        return p5.Vector.sub(dest, this.pos).mag();
    }

    draw() {
        if (this.state === this.STATE_EXITED) return;

        const p = this.p;
        const s = x => x * this.settings.geom.scaleMetersTo3dUnits;
        const legLength = s(this.height / 3);
        const height = s(this.height) - legLength;
        const width = s(this.width);
        p.pushed(() => {
            p.translate(this.pos.x, this.pos.y, this.pos.z);
            p.pushed(() => {
                p.translate(0, legLength + height / 2, 0);
                p.noStroke();
                p.fill(this.color[0], this.color[1], this.color[2]);
                p.ellipsoid(width / 2, height / 2, this.width / 2);
            });

            p.pushed(() => {
                p.translate(0, legLength + height + s(0.5), 0);
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
