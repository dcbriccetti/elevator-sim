export default class MotorSound {

    constructor(pan) {
        const osc = this.osc = new p5.Oscillator(0, 'triangle');
        osc.pan(pan);
        osc.amp(0);
        osc.start();
    }
}
