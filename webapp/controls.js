export default class Controls {
    constructor(p, settings) {
        this.p = p;
        this.settings = settings;
    }

    createKnobs(passengerLoadTypes) {
        const p = this.p;
        const settings = this.settings;
        const elevSpeed = p.select('#elevSpeed');
        elevSpeed.value(settings.elevSpeed);
        elevSpeed.changed(() => settings.elevSpeed = elevSpeed.value());

        const volume = p.select('#volume');
        volume.value(settings.volume);
        volume.changed(() => {
            if (p.getAudioContext().state !== 'running') {  // todo Is this required?
              p.getAudioContext().resume();
            }
            settings.volume = volume.value();
            p.dingSound.setVolume(volume.value() / 500);  // It’s much louder than the motors
        });

        const projection = p.createSelect();
        ['Perspective', 'Orthographic'].forEach(p => projection.option(p));
        projection.parent('#projectionParent');
        projection.changed(() => settings.projectionType = projection.elt.selectedIndex);

        const view = p.createSelect();
        ['Front', 'Side', 'Use Mouse'].forEach(v => view.option(v));
        view.parent('#viewParent');
        view.changed(() => settings.view = view.elt.selectedIndex);

        const passengerLoad = p.createSelect();
        passengerLoadTypes.forEach(o => passengerLoad.option(o));
        passengerLoad.parent('#passengerLoadParent');
        passengerLoad.changed(() => settings.passengerLoad = passengerLoad.elt.selectedIndex);
    }
}
