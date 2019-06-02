class Rider {
    constructor(startFloor, destFloor, cars) {
        this.STATE_WAITING  = 1;
        this.STATE_BOARDING = 2;
        this.STATE_RIDING   = 3;
        this.STATE_EXITING  = 4;
        this.floor = startFloor;
        this.destFloor = destFloor;
        this.cars = cars;
        this.height = 6;
        this.pos = createVector(randomGaussian(width / 2, width / 10), yFromFloor(this.floor) + this.height, 0);
        this.state = this.STATE_WAITING;
        this.carIn = undefined;
        console.log(`Rider on ${startFloor} going to ${destFloor}`);
        dispatcher.call(this.floor);
    }

    update() {
        switch (this.state) {
            case this.STATE_WAITING:
                const openCar = this.cars.find(car => car.state === car.STATE_OPEN && car.y === yFromFloor(this.floor));
                if (openCar) {
                    const dx = CAR_DIMS.width * 0.4;
                    const dz = CAR_DIMS.depth * 0.4;
                    this.pos.x = openCar.carCenterX() + map(random(1), 0, 1, -dx, dx);
                    this.pos.z = openCar.carCenterZ() + map(random(1), 0, 1, -dz, dz);
                    this.state = this.STATE_RIDING;
                    this.carIn = openCar;
                    this.carIn.goTo(this.destFloor);
                }
                break;
            case this.STATE_RIDING:
                this.pos.y = this.carIn.y;
                if (this.carIn.state === this.carIn.STATE_OPEN && this.carIn.y === yFromFloor(this.destFloor)) {
                    this.state = this.STATE_EXITING;
                }
                break;
        }
    }

    draw() {
        push();
        noStroke();
        fill(200, 0, 0, 128);
        translate(this.pos.x, this.pos.y + this.height, this.pos.z);
        ellipsoid(3, this.height, 3);
        pop();
    }
}
