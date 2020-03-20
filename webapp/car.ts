enum CarState {Idle, Moving, Opening, Open, Closing}

class Car {
    private readonly p: any;
    private settings: any;
    private stats: any;
    private readonly carNumber: number;
    private readonly doorDims: any;
    private readonly carHorizontalSpacing: number;
    private readonly carLeftMargin: number;
    private goingUp: boolean;
    private doorOpenFraction: number;
    private destFloors: any[];
    private riders: any[];
    private readonly pan: number;
    private sound: MotorSound;
    private readonly active: boolean;
    private state: CarState;
    private openSince: number;
    private lastMoveTime: number;
    private speed: number;
    private maxMaxSpeed: number;
    private maxSpeed: number;
    private accel: number;
    private startY: number;
    private endY: number;
    private absTrip: number;
    private accelDistance: number;
    private doorOpStarted: number;
    private y: number;

    constructor(p, settings, stats, carNumber) {
        this.p = p;
        this.settings = settings;
        this.stats = stats;
        this.carNumber = carNumber;

        const gc = settings.geom.car;
        this.doorDims = p.createVector(gc.x / 4, gc.y, 5);
        const interCarSpacing = gc.x;
        this.carHorizontalSpacing = gc.x + interCarSpacing;
        const carsGroupWidth = settings.numCars * gc.x + (settings.numCars - 1) * interCarSpacing;
        const leftRightMargin = settings.geom.canvas.x - carsGroupWidth;
        this.carLeftMargin = leftRightMargin / 2;
        this.y = p.yFromFloor(1);
        this.goingUp = true;
        this.doorOpenFraction = 0;  // 0…1 = closed…open
        this.destFloors = [];
        this.riders = [];
        this.pan = settings.numCars === 1 ? 0 : p.map(carNumber, 1, settings.numCars, -0.8, 0.8);
        this.sound = new MotorSound(this.pan);
        this.active = false;
        this.state = CarState.Idle;
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
        const cWeightDepth = 5;
        const backOfCarZ = geom.carCenterZ - cg.z / 2;
        const cWeightZ = backOfCarZ - carToCwDist - cWeightDepth / 2;
        const cWeightY = p.height - this.y;
        const cWeightHeight = cg.y / 2;
        const inst = this;

        function drawCounterWeight() {
            p.stroke(220);
            p.noFill();
            p.pushed(() => {
                p.translate(inst.carCenterX(), cWeightY, cWeightZ);
                p.box(cg.x, cWeightHeight, cWeightDepth);
            });
        }

        drawCounterWeight();
        this.drawCables(p, cWeightY + cWeightHeight / 2, p.height, cWeightZ);
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
        p.fill(194, 255 * (this.active ? 0.6 : 0.3));
        p.pushed(() => {
            const gc = this.settings.geom.car;
            p.translate(this.carCenterX(), this.y + gc.y / 2, this.settings.geom.carCenterZ);
            p.box(gc.x, gc.y, gc.z);
            this.drawDoors();
        });
    }

    carCenterX() {
        return this.carLeftMargin + (this.carNumber - 1) * this.carHorizontalSpacing;
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
            const xDoorDisplacement = gc.x / 8 + doorTravel * this.doorOpenFraction;

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
            case CarState.Idle:
                this.idle(p);
                break;
            case CarState.Moving:
                this.move(p);
                break;
            case CarState.Opening:
                this.doorOpenFraction = p.constrain((this.nowSecs() - this.doorOpStarted) / this.settings.doorMovementSecs, 0, 1);
                if (this.doorOpenFraction === 1) {
                    this.state = CarState.Open;
                    this.openSince = p.millis();
                }
                break;
            case CarState.Open:
                const timeToClose = this.openSince + this.settings.doorOpenMs;
                const timeToWait = timeToClose - p.millis();
                if (timeToWait <= 0) {
                    this.state = CarState.Closing;
                    this.doorOpStarted = this.nowSecs();
                }
                break;
            case CarState.Closing:
                this.doorOpenFraction = 1 - p.constrain((this.nowSecs() - this.doorOpStarted) / this.settings.doorMovementSecs, 0, 1);
                if (this.doorOpenFraction === 0) {
                    this.state = CarState.Idle;
                }
                break;
        }
    }

    nowSecs() {
        return this.p.millis() / 1000;
    }

    idle(p) {
        if (this.destFloors.length) {
            let nextDest = this.destFloors.find(f =>
                this.goingUp ? p.yFromFloor(f) > this.y : p.yFromFloor(f) < this.y);
            if (!nextDest) {
                this.goingUp = !this.goingUp;
                this.sortDestinations();
                nextDest = this.destFloors[0];
            }
            this.stats.addMovementCosts(Math.abs(p.floorFromY(this.y) - nextDest), this.settings.elevSpeed);
            this.state = CarState.Moving;
            this.sound.osc.amp(p.map(this.settings.volume, 0, 10, 0, 0.6), 0.02);
            console.log(`Car ${this.carNumber} moving to ${nextDest} of ${this.destFloors}`);
            this.lastMoveTime = p.millis() / 1000;
            this.speed = 0;
            this.maxMaxSpeed = 1000;
            this.maxSpeed = p.map(this.settings.elevSpeed, 1, 10, 20, this.maxMaxSpeed);
            this.accel = this.maxSpeed * 2;
            this.startY = this.y;
            this.endY = p.yFromFloor(nextDest);
            this.absTrip = Math.abs(this.startY - this.endY);
            this.accelDistance = Math.min(this.absTrip / 2,
                (this.maxSpeed * this.maxSpeed) / (2 * this.accel));
        }
    }

    move(p) {
        const absTraveled = Math.abs(this.y - this.startY);
        const absTravelLeft = Math.abs(this.endY - this.y);
        const now = p.millis() / 1000;
        const ΔtSinceLastMove = now - this.lastMoveTime;
        this.lastMoveTime = now;
        if (this.accelerating()) {
            this.speed = Math.max(1, Math.sqrt(2 * this.accel * absTraveled));
        } else if (this.decelerating()) {
            this.speed = Math.sqrt(2 * this.accel * absTravelLeft);
        }
        this.sound.osc.freq(p.map(this.speed, 0, this.maxMaxSpeed, 40, 100));

        const ΔySinceLastMove = Math.min(absTravelLeft, this.speed * ΔtSinceLastMove);
        const direction = this.goingUp ? 1 : -1;
        this.y += direction * ΔySinceLastMove;

        const absTravelLeftAfterMove = Math.abs(this.endY - this.y);
        if (absTravelLeftAfterMove < 1) {
            this.y = this.endY;
            this.sound.osc.amp(0, 0.02);
            this.doorOpStarted = this.nowSecs();
            this.state = CarState.Opening;
            this.removeCurrentFloorFromDest();
            if (this.y === p.yFromFloor(1)) this.goingUp = true;
            if (this.y === p.yFromFloor(this.settings.numFloors)) this.goingUp = false;
            if (this.settings.volume > 0) {
                p.dingSound.pan(this.pan);
                p.dingSound.play();
            }
        }
    }

    addRider(rider) {
        this.riders.push(rider);
    }

    removeRider(rider) {
        this.riders = this.riders.filter(r => r !== rider);
    }

    hasRoom(): boolean {
        return this.riders.length < this.settings.maxRidersPerCar;
    }

    decelerating(): boolean {
        return Math.abs(this.y - this.endY) < this.accelDistance && this.speed > 0;
    }

    accelerating(): boolean {
        return Math.abs(this.y - this.startY) < this.accelDistance && this.speed < this.maxSpeed;
    }

    removeCurrentFloorFromDest() {
        this.destFloors = this.destFloors.filter(f => this.p.yFromFloor(f) !== this.y);
    }

    goTo(floor, manual=false) {
        if (manual || this.settings.controlMode === 0 /* Auto */) {
            if (!this.destFloors.find(f => f === floor)) {
                this.destFloors.push(floor);
                this.sortDestinations();
                console.log(`Car ${this.carNumber} will go to ${floor}`);
            }
        }
    }

    sortDestinations() {
        this.destFloors.sort((a, b) => this.goingUp ? a - b : b - a);
    }
}
