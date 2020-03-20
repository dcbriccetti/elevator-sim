class Talker {
    private settings: any;
    private speech = speechSynthesis;
    private utterances = {
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
        leaving: ['thank you, elevator', 'thanks', 'bye', 'so long', 'good times', 'far out', 'namaste'],
        tooLate: ['darn it!', 'stupid elevator', 'oh, i missed it', 'i ran as fast as i could', 'bummer'],
        carFull: ['that\'s a full car', 'a lot of people', 'too crowded', 'wow, full', 'full'],
    };
    private voices: any;
    private englishVoices: any;
    private nextSpeechAllowedTime: number;

    constructor(settings) {
        this.settings = settings;
        this.nextSpeechAllowedTime = new Date().getTime();
    }

    whenLoaded(loaded = () => {}) {
        const talker = this;

        function populateVoiceList() {
            if (typeof speechSynthesis === 'undefined' || talker.voices !== undefined) {
                return;
            }

            const unwantedVoices = new Set('Alex Daniel Fred Jorge Victoria Zosia'.split(' '));
            const allVoices = speechSynthesis.getVoices();
            if (allVoices.length) {
                talker.voices = talker.speech.getVoices().filter(v => ! unwantedVoices.has(v.name));
                talker.englishVoices = talker.voices.filter(v => v.lang.startsWith('en'));
                loaded();
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
        if (new Date().getTime() > this.nextSpeechAllowedTime && this.voices.length && ! this.speech.speaking && this.settings.speakersType > 0) {
            const utterance = new SpeechSynthesisUtterance();
            utterance.volume = this.settings.volume / 10;
            utterance.voice = voiceName ?
              this.voice(voiceName) :
              this.randChoice(this.settings.speakersType === 1 ? this.voices : this.englishVoices);
            console.log(utterance.voice);
            utterance.text = message;
            this.speech.speak(utterance);
            this.nextSpeechAllowedTime = new Date().getTime() + 5_000;
        }
    }

    voice(voiceName) {
        return this.voices.find(v => v.name === voiceName);
    }

    randChoice(sequence) {
        return sequence[Math.floor(Math.random() * sequence.length)];
    }
}
