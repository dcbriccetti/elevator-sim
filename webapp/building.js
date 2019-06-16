export default class Building {

    constructor(settings, cars) {
        this.settings = settings;
        this.cars = cars;
    }

    drawFloors(p) {
        p.noStroke();
        p.fill(0, 0, 100, 20);
        for (let floor = 1; floor <= this.settings.numFloors; ++floor) {
            const floorY = p.yFromFloor(floor);
            p.pushed(() => {
                const floorHeight = 4;
                p.translate(p.width / 2, floorY - floorHeight / 2,
                    floor === 1 ? -this.settings.geom.floorDepthOthers / 2 : 0);
                p.box(p.width, floorHeight,
                    floor === 1 ? this.settings.geom.floorDepthGround : this.settings.geom.floorDepthOthers);
            });
            this.cars.forEach(car => {
                p.pushed(() => {
                    const gc = this.settings.geom.car;
                    const indHeight = gc.y / 3;
                    p.translate(car.carCenterX(), floorY + gc.y + indHeight / 2,
                        this.settings.geom.carCenterZ + gc.z / 2);
                    p.noStroke();
                    const carReady = floorY === car.y && (car.state === car.STATE_OPENING || car.state === car.STATE_OPEN);
                    if (carReady) {
                        this.drawUpDownIndicator(p, indHeight, car.goingUp);
                    }
                });
            });
        }
    }

    drawUpDownIndicator(p, indHeight, goingUp) {
        p.stroke(125, 84);
        p.fill(255, 248);
        p.plane(14, indHeight);
        p.noStroke();
        p.fill('green');
        goingUp ?
            p.triangle(0, 5, -4, -4, 4, -4) :
            p.triangle(0, -4, -4, 5, 4, 5);
    }
}
