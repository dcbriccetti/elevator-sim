class Car {
    constructor(carNumber) {
        this.STATE_IDLE    = 1;
        this.STATE_MOVING  = 2;
        this.STATE_OPENING = 3;
        this.STATE_OPEN    = 4;
        this.STATE_CLOSING = 5;

        this.carNumber = carNumber;
        this.y = yFromFloor(1);
        this.state = this.STATE_IDLE;
        this.doorOpen = 0;  // 0…1 = closed…open
        this.destFloors = [];
    }

    draw() {
        this.drawRails();
        this.drawCar();
    }

    drawCar() {
        stroke('silver');
        strokeWeight(2);
        fill('rgba(75%, 75%, 100%, 0.2)');
        push();

        translate(this.carCenterX(),
            this.y + CAR_DIMS.height / 2, this.carCenterZ());
        box(CAR_DIMS.width, CAR_DIMS.height, CAR_DIMS.depth);
        this.drawDoors();
        pop();
    }

    carCenterZ() {
        return -CAR_DIMS.depth;
    }

    carCenterX() {
        return CAR_LEFT_MARGIN + (this.carNumber - 1) * CAR_HORZ_SPACING;
    }

    drawDoors() {
        strokeWeight(1);
        fill('rgba(75%, 100%, 75%, 0.5)');

        // Bring doors to front of car
        translate(0, 0, CAR_DIMS.depth / 2 - DOOR.depth);
        const doorTravel = CAR_DIMS.width / 4;
        const xDoorDisplacement = CAR_DIMS.width / 8 + doorTravel * this.doorOpen;

        [1, -1].forEach(sign => {
            push();
            translate(sign * xDoorDisplacement, 0, 0);
            box(DOOR.width, DOOR.height, DOOR.depth);
            pop();
        });
    }

    update() {
        switch (this.state) {
            case this.STATE_IDLE:
                if (this.destFloors.length > 0) {
                    this.state = this.STATE_MOVING;
                    this.destFloors = this.destFloors.filter(f => yFromFloor(f) !== this.y);
                    console.log(`Car ${this.carNumber} moving to ${this.destFloors}`)
                }
                break;
            case this.STATE_MOVING:
                const travelLeft = Math.floor(yFromFloor(this.destFloors[0]) - this.y);
                if (travelLeft > 0) this.y += 5;
                else if (travelLeft < 0) this.y -= 5;
                else {
                    this.state = this.STATE_OPENING;
                    this.destFloors.pop();
                }
                break;
            case this.STATE_OPENING:
                if (this.doorOpen < 1.0) {
                    this.doorOpen += 0.01;  // Open doors
                } else {
                    this.state = this.STATE_OPEN;
                    this.openSince = millis();
                }
                break;
            case this.STATE_OPEN:
                const timeToClose = this.openSince + OPEN_MILLIS;
                const timeToWait = timeToClose - millis();
                if (timeToWait <= 0) {
                    this.state = this.STATE_CLOSING;
                }
                break;
            case this.STATE_CLOSING:
                if (this.doorOpen > 0) {
                    this.doorOpen -= 0.01;  // Close doors
                } else {
                    this.state = this.STATE_IDLE;
                    this.doorOpen = 0;
                }
                break;
        }
    }

    atTargetFloor() {
        return yFromFloor(this.destFloors[0]) === this.y;
    }

    goTo(floor) {
        if (! this.destFloors.find(f => f === floor)) {
            this.destFloors.push(floor);
            console.log(`Car ${this.carNumber} requested at ${floor}`);
        }
    }

    drawRails() {
        noStroke();
        fill(128, 16);
        [-CAR_DIMS.width / 2, CAR_DIMS.width / 2].forEach(xOff => {
            [-CAR_DIMS.depth / 2, CAR_DIMS.depth / 2].forEach(zOff => {
                push();
                translate(this.carCenterX() + xOff, height / 2, this.carCenterZ() + zOff);
                box(2, height - FLOOR_1_Y * 2, 1);
                pop();
            });
        });
    }
}
