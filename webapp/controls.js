export default class Controls {
    constructor(p, settings, stats) {
        this.p = p;
        this.settings = settings;
        this.stats = stats;
        this.activeCarsChange = () => {};
        this.volumeChange = v => {};
    }

    createKnobs(passengerLoadTypes) {
        const p = this.p;
        const settings = this.settings;

        const elevSpeed = p.select('#elevSpeed');
        elevSpeed.value(settings.elevSpeed);
        elevSpeed.changed(() => settings.elevSpeed = elevSpeed.value());

        const numCars = p.select('#numActiveCars');
        numCars.value(settings.numActiveCars);
        numCars.changed(() => {
            settings.numActiveCars = numCars.value();
            this.activeCarsChange();
        });

        const volume = p.select('#volume');
        volume.value(settings.volume);
        volume.changed(() => {
            if (p.getAudioContext().state !== 'running') {  // todo Is this required?
              p.getAudioContext().resume();
            }
            settings.volume = volume.value();
            p.dingSound.setVolume(volume.value() / 100);  // It’s much louder than the motors
            this.volumeChange(settings.volume / 10);
        });

        const projection = p.createSelect();
        ['Perspective', 'Orthographic'].forEach(p => projection.option(p));
        projection.parent('#projectionParent');
        projection.changed(() => settings.projectionType = projection.elt.selectedIndex);

        const controlMode = p.createSelect();
        ['Auto', 'Manual'].forEach(p => controlMode.option(p));
        controlMode.parent('#controlModeParent');
        controlMode.changed(() => settings.controlMode = controlMode.elt.selectedIndex);

        const view = p.createSelect();
        ['Front', 'Side', 'Use Mouse'].forEach(v => view.option(v));
        view.parent('#viewParent');
        view.changed(() => settings.view = view.elt.selectedIndex);

        const passengerLoad = p.createSelect();
        passengerLoadTypes.forEach(o => passengerLoad.option(o));
        passengerLoad.parent('#passengerLoadParent');
        passengerLoad.changed(() => settings.passengerLoad = passengerLoad.elt.selectedIndex);

        this.paymentsChart = p.createGraphics(this.stats.maxRecentRiderPayments,
            15).parent('#paymentsChart');
        $('#paymentsChart canvas').show();
        
        const speakers = p.createSelect();
        ['None', 'All', 'Native English'].forEach(p => speakers.option(p));
        speakers.parent('#speakersParent');
        speakers.changed(() => settings.speakersType = speakers.elt.selectedIndex);
    }
}
