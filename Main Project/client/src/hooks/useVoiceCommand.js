import { useEffect, useState } from 'react';

const SOS_TRIGGERS = ['sos', 'help me', 'emergency', 'accident'];

const useVoiceCommand = (triggerSOS) => {
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return undefined;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      setLastTranscript(transcript);
      if (SOS_TRIGGERS.some((t) => transcript.includes(t))) {
        triggerSOS('voice');
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [triggerSOS]);

  return { listening, lastTranscript };
};

export default useVoiceCommand;

