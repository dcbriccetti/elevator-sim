export default class Car {
    constructor(p, settings, carNumber) {
        this.p = p;
        this.settings = settings;
        this.carNumber = carNumber;
        this.STATE_IDLE    = 1;
        this.STATE_MOVING  = 2;
        this.STATE_OPENING = 3;
        this.STATE_OPEN    = 4;
        this.STATE_CLOSING = 5;
        const gc = settings.geom.car;
        this.doorDims = p.createVector(gc.x / 4, gc.y, 5);
        this.OPEN_MILLIS = 1500;
        const interCarSpacing = gc.x;
        this.CAR_HORZ_SPACING = gc.x + interCarSpacing;
        const carsGroupWidth = settings.numCars * gc.x + (settings.numCars - 1) * interCarSpacing;
        const leftRightMargin = settings.geom.canvas.x - carsGroupWidth;
        this.CAR_LEFT_MARGIN = leftRightMargin / 2;
        this.y = p.yFromFloor(1);
        this.state = this.STATE_IDLE;
        this.doorOpen = 0;  // 0…1 = closed…open
        this.destFloors = [];
    }

    draw() {
        this.drawRails();
        this.drawCar();
    }

    drawCar() {
        const p = this.p;
        p.stroke('silver');
        p.strokeWeight(2);
        p.fill('rgba(75%, 75%, 100%, 0.2)');
        p.push();
        const gc = this.settings.geom.car;
        p.translate(this.carCenterX(),
            this.y + gc.y / 2, this.carCenterZ());
        p.box(gc.x, gc.y, gc.z);
        this.drawDoors();
        p.pop();
    }

    carCenterZ() {
        return -this.settings.geom.car.z;
    }

    carCenterX() {
        return this.CAR_LEFT_MARGIN + (this.carNumber - 1) * this.CAR_HORZ_SPACING;
    }

    drawDoors() {
        const p = this.p;
        p.strokeWeight(1);
        p.fill('rgba(75%, 100%, 75%, 0.5)');

        // Bring doors to front of car
        const gc = this.settings.geom.car;
        p.translate(0, 0, gc.z / 2 - this.doorDims.z);
        const doorTravel = gc.x / 4;
        const xDoorDisplacement = gc.x / 8 + doorTravel * this.doorOpen;

        [1, -1].forEach(sign => {
            p.push();
            p.translate(sign * xDoorDisplacement, 0, 0);
            p.box(this.doorDims.x, this.doorDims.y, this.doorDims.z);
            p.pop();
        });
    }

    update() {
        const p = this.p;
        switch (this.state) {
            case this.STATE_IDLE:
                if (this.destFloors.length > 0) {
                    this.state = this.STATE_MOVING;
                    this.removeCurrentFloorFromDest();
                    console.log(`Car ${this.carNumber} moving to ${this.destFloors}`);
                    this.startY = this.y;
                    this.endY = p.yFromFloor(this.destFloors[0]);
                    this.travelDist = Math.abs(this.endY - this.startY);
                }
                break;
            case this.STATE_MOVING:
                const absTraveled = Math.abs(this.startY - this.y);
                const travelPart = Math.abs(absTraveled / this.travelDist);
                const travelLeft = this.endY - this.y;
                const absTravelLeft = Math.abs(travelLeft);
                const partOfPi = p.map(travelPart, 0, 1, 0, p.PI);
                const speed = Math.min(absTravelLeft, 1 + p.sin(partOfPi) * 30);
                if (travelLeft > 0) this.y += speed;
                else if (travelLeft < 0) this.y -= speed;
                else {
                    this.state = this.STATE_OPENING;
                    this.removeCurrentFloorFromDest();
                }
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

    removeCurrentFloorFromDest() {
        this.destFloors = this.destFloors.filter(f => this.p.yFromFloor(f) !== this.y);
    }

    goTo(floor) {
        if (! this.destFloors.find(f => f === floor)) {
            this.destFloors.push(floor);
            this.destFloors.sort((a, b) => a - b);
            console.log(`Car ${this.carNumber} requested at ${floor}`);
        }
    }

    drawRails() {
        const p = this.p;
        p.noStroke();
        p.fill(128, 16);
        const cd = this.settings.geom.car;
        const hw = cd.x / 2;
        const hd = cd.z / 2;
        [-hw, hw].forEach(xOff => {
            [-hd, hd].forEach(zOff => {
                p.push();
                p.translate(this.carCenterX() + xOff, p.height / 2, this.carCenterZ() + zOff);
                p.box(2, p.height, 1);
                p.pop();
            });
        });
    }
}
