export default class Talker {
    constructor(loaded = (voices, englishVoices) => {}) {
        this.speech = window.speechSynthesis;
        this.utterance = new SpeechSynthesisUtterance();
        this.utterance.volume = 0;
        this.voices = null;
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

        const unwantedVoices = new Set('Alex Daniel Fred Jorge Victoria Zosia'.split(' '));
        this.speech.onvoiceschanged = () => {
            this.voices = this.speech.getVoices().filter(v => ! unwantedVoices.has(v.name));
            this.englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
            loaded(this.voices.map(v => v.name), this.englishVoices.map(v => v.name));
        };
    }

    speakRandom(category, voiceName, probability) {
        if (Math.random() <= probability) {
            this.speak(this.randChoice(this.utterances[category]), voiceName)
        }
    }

    speak(message, voiceName) {
        if (! this.speech.speaking) {
            this.utterance.voice = voiceName ? this.voice(voiceName) : this.randChoice(this.voices);
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
