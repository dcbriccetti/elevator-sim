export default class Talker {
    constructor(settings, loaded = (voices, englishVoices) => {}) {
        this.settings = settings;
        this.speech = speechSynthesis;
        this.utterance = new SpeechSynthesisUtterance();
        this.utterance.volume = 0;
        this.utterances = {
            arriving: [
                'i would like a ride', 
                'nice day for an elevator ride', 
                'i hope this is fast', 
                "i'm in a hurry",
                "let's get this over with",
                'how about those astros',
                'i love elevators',
                'is this real life?'
            ],
            leaving:  ['thank you, elevator', 'thanks', 'bye', 'so long', 'good times', 'far out', 'namaste'],
            tooLate:  ['darn it!', 'stupid elevator', 'oh, i missed it', 'i ran as fast as i could', 'bummer'],
            carFull:  ['that\'s a full car', 'a lot of people', 'too crowded', 'wow, full', 'full'],
        };
        const talker = this;

        function populateVoiceList() {
            console.log('populateVoiceList called');
            if (typeof speechSynthesis === 'undefined' || talker.voices !== undefined) {
                console.log('skipping');
                return;
            }

            const unwantedVoices = new Set('Alex Daniel Fred Jorge Victoria Zosia'.split(' '));
            const allVoices = speechSynthesis.getVoices();
            if (allVoices.length) {
                talker.voices = talker.speech.getVoices().filter(v => ! unwantedVoices.has(v.name));
                talker.englishVoices = talker.voices.filter(v => v.lang.startsWith('en'));
                loaded(talker.voices.map(v => v.name), talker.englishVoices.map(v => v.name));
            }
        }

        populateVoiceList();
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }

    speakRandom(category, voiceName, probability) {
        if (Math.random() <= probability) {
            this.speak(this.randChoice(this.utterances[category]), voiceName)
        }
    }

    speak(message, voiceName) {
        if (this.voices.length && ! this.speech.speaking && this.settings.speakersType > 0) {
            this.utterance.voice = voiceName ? this.voice(voiceName) : this.randChoice(this.settings.speakersType === 1 ?
            this.voices : this.englishVoices);
            console.log(this.utterance.voice);
            this.utterance.text = message;
            this.speech.speak(this.utterance);
        }
    }

    voice(voiceName) {
        return this.voices.find(v => v.name === voiceName);
    }

    volume(v /* 0 to 1 */) {
        this.utterance.volume = v;
    }

    randChoice(sequence) {
        return sequence[Math.floor(Math.random() * sequence.length)];
    }
}
