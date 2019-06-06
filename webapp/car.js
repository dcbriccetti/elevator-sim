import MotorSound from './sound.js';

export default class Car {
    constructor(p, settings, carNumber) {
        this.p = p;
        this.settings = settings;
        this.carNumber = carNumber;
        this.STATE_IDLE = 1;
        this.STATE_MOVING = 2;
        this.STATE_OPENING = 3;
        this.STATE_OPEN = 4;
        this.STATE_CLOSING = 5;
        const gc = settings.geom.car;
        this.doorDims = p.createVector(gc.x / 4, gc.y, 5);
        this.OPEN_MILLIS = 2500;
        const interCarSpacing = gc.x;
        this.CAR_HORZ_SPACING = gc.x + interCarSpacing;
        const carsGroupWidth = settings.numCars * gc.x + (settings.numCars - 1) * interCarSpacing;
        const leftRightMargin = settings.geom.canvas.x - carsGroupWidth;
        this.CAR_LEFT_MARGIN = leftRightMargin / 2;
        this.y = p.yFromFloor(1);
        this.state = this.STATE_IDLE;
        this.movingUp = true;
        this.doorOpen = 0;  // 0…1 = closed…open
        this.destFloors = [];
        this.pan = settings.numCars === 1 ? 0 : p.map(carNumber, 1, settings.numCars, -0.8, 0.8);
        this.sound = new MotorSound(this.pan);
    }

    draw() {
        this.drawRails();
        this.drawCablesAndCounterweight();
        this.drawCar();
    }

    drawRails() {
        const p = this.p;
        p.noStroke();
        p.fill(128, 16);
        const cd = this.settings.geom.car;
        const halfCarWidth = cd.x / 2;
        const halfCarDepth = cd.z / 2;
        [-halfCarWidth, halfCarWidth].forEach(xOff => {
            [-halfCarDepth, halfCarDepth].forEach(zOff => {
                p.pushed(() => {
                    p.translate(this.carCenterX() + xOff, p.height / 2, this.settings.geom.carCenterZ + zOff);
                    p.box(2, p.height, 1);
                });
            });
        });
    }

    drawCablesAndCounterweight() {
        const p = this.p;
        const geom = this.settings.geom;
        const cg = geom.car;
        const yCarTop = this.y + cg.y;
        const carToCwDist = cg.z * 0.8;
        const cwDepth = 5;
        const backOfCar = geom.carCenterZ - cg.z / 2;
        const cwZ = backOfCar - carToCwDist - cwDepth / 2;
        const cwY = p.height - this.y;
        const cwHeight = cg.y / 2;
        const inst = this;

        function drawCounterWeight() {
            p.stroke(220);
            p.noFill();
            p.pushed(() => {
                p.translate(inst.carCenterX(), cwY, cwZ);
                p.box(cg.x, cwHeight, cwDepth);
            });
        }

        drawCounterWeight();
        this.drawCables(p, cwY + cwHeight / 2, p.height, cwZ);
        this.drawCables(p, yCarTop, p.height, geom.carCenterZ);
    }

    drawCables(p, yBottom, yTop, cablesZ) {
        p.stroke(180, 32);
        p.noFill();
        const yMiddle = yBottom + (yTop - yBottom) / 2;
        [-3, 0, 3].forEach(xOff => {
            p.pushed(() => {
                p.translate(this.carCenterX() + xOff, yMiddle, cablesZ);
                p.box(1, yTop - yBottom, 1);
            });
        });
    }

    drawCar() {
        const p = this.p;
        p.stroke('silver');
        p.strokeWeight(2);
        p.fill(194, 255 * 0.5);
        p.pushed(() => {
            const gc = this.settings.geom.car;
            p.translate(this.carCenterX(), this.y + gc.y / 2, this.settings.geom.carCenterZ);
            p.box(gc.x, gc.y, gc.z);
            this.drawDoors();
        });
    }

    carCenterX() {
        return this.CAR_LEFT_MARGIN + (this.carNumber - 1) * this.CAR_HORZ_SPACING;
    }

    drawDoors() {
        const p = this.p;
        p.strokeWeight(1);
        p.fill(230, 255 * 0.5);

        p.pushed(() => {
            // Bring doors to front of car
            const gc = this.settings.geom.car;
            const dd = this.doorDims;
            p.translate(0, 0, gc.z / 2 - dd.z);
            const doorTravel = gc.x / 4;
            const xDoorDisplacement = gc.x / 8 + doorTravel * this.doorOpen;

            [1, -1].forEach(sign => {
                p.pushed(() => {
                    p.translate(sign * xDoorDisplacement, 0, 0);
                    p.box(dd.x, dd.y, dd.z);
                });
            });
        });
    }

    update() {
        const p = this.p;
        switch (this.state) {
            case this.STATE_IDLE:
                this.idle(p);
                break;
            case this.STATE_MOVING:
                this.move(p);
                break;
            case this.STATE_OPENING:
                if (this.doorOpen < 1.0) {
                    this.doorOpen += 0.05;  // Open doors
                } else {
                    this.state = this.STATE_OPEN;
                    this.openSince = p.millis();
                }
                break;
            case this.STATE_OPEN:
                const timeToClose = this.openSince + this.OPEN_MILLIS;
                const timeToWait = timeToClose - p.millis();
                if (timeToWait <= 0) {
                    this.state = this.STATE_CLOSING;
                }
                break;
            case this.STATE_CLOSING:
                if (this.doorOpen > 0) {
                    this.doorOpen -= 0.05;  // Close doors
                } else {
                    this.state = this.STATE_IDLE;
                    this.doorOpen = 0;
                }
                break;
        }
    }

    idle(p) {
        if (this.destFloors.length > 0) {
            let nextDest = this.destFloors.find(f =>
                this.movingUp ? p.yFromFloor(f) > this.y : p.yFromFloor(f) < this.y);
            if (!nextDest) {
                this.movingUp = !this.movingUp;
                this.sortDestinations();
                nextDest = this.destFloors[0];
            }
            this.state = this.STATE_MOVING;
            this.sound.osc.amp(p.map(this.settings.volume, 0, 10, 0, 0.3), 0.02);
            console.log(`Car ${this.carNumber} moving to ${this.destFloors}`);
            this.startY = this.y;
            this.endY = p.yFromFloor(nextDest);
            this.travelDist = Math.abs(this.endY - this.startY);
        }
    }

    move(p) {
        const absTraveled = Math.abs(this.startY - this.y);
        const travelPart = Math.abs(absTraveled / this.travelDist);
        const travelLeft = this.endY - this.y;
        const absTravelLeft = Math.abs(travelLeft);
        const partOfPi = p.map(travelPart, 0, 1, 0, p.PI);
        const speedMultiplier = this.settings.elevSpeed * 5;
        const speed = Math.min(absTravelLeft, 1 + p.sin(partOfPi) * speedMultiplier);
        this.sound.osc.freq(speed * 15);
        if (travelLeft > 0) this.y += speed;
        else if (travelLeft < 0) this.y -= speed;
        else {
            this.sound.osc.amp(0, 0.02);
            this.state = this.STATE_OPENING;
            this.removeCurrentFloorFromDest();
            if (this.settings.volume > 0) {
                p.dingSound.pan(this.pan);
                p.dingSound.play();
            }
        }
    }

    removeCurrentFloorFromDest() {
        this.destFloors = this.destFloors.filter(f => this.p.yFromFloor(f) !== this.y);
    }

    goTo(floor) {
        if (!this.destFloors.find(f => f === floor)) {
            this.destFloors.push(floor);
            this.sortDestinations();
            console.log(`Car ${this.carNumber} requested at ${floor}`);
        }
    }

    sortDestinations() {
        this.destFloors.sort((a, b) => this.movingUp ? a - b : b - a);
    }
}
