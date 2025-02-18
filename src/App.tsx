import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import * as Tone from 'tone';
import './App.css';

interface AudioAnalysis {
  frequency: number;
  amplitude: number;
  timestamp: number;
}

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remixProgress, setRemixProgress] = useState(0);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis[]>([]);
  const [peakAmplitude, setPeakAmplitude] = useState<number>(0);
  const [dominantFrequency, setDominantFrequency] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer>();
  const synthRef = useRef<Tone.PolySynth>();
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioContextInitialized, setAudioContextInitialized] = useState(false);

  useEffect(() => {
    // Initialize WaveSurfer
    if (waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4a9eff',
        progressColor: '#9f6eff',
        cursorColor: '#00ff88',
        height: 100,
        barWidth: 2,
        barGap: 1,
        plugins: [
          WaveSurfer.spectrogram.create({
            wavesurfer: wavesurferRef.current,
            container: '#spectrogram',
            labels: true,
            height: 100,
            colorMap: [
              [0, 0, 0, 1],
              [0, 74, 255, 1],
              [159, 110, 255, 1]
            ]
          })
        ]
      });

      // Create AudioContext and Analyser
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      setAudioContext(ctx);
    }

    return () => {
      wavesurferRef.current?.destroy();
      audioContext?.close();
    };
  }, []);

  const initializeAudioContext = async () => {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
      await Tone.start();
      setAudioContextInitialized(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await initializeAudioContext();
      setAudioFile(file);
      const audioUrl = URL.createObjectURL(file);
      wavesurferRef.current?.load(audioUrl);
    }
  };

  const togglePlayback = async () => {
    if (wavesurferRef.current) {
      await initializeAudioContext();
      wavesurferRef.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    // Calculate dominant frequency
    let maxAmplitude = -Infinity;
    let dominantFreqBin = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxAmplitude) {
        maxAmplitude = dataArray[i];
        dominantFreqBin = i;
      }
    }

    const dominantFreq = (dominantFreqBin * audioContext!.sampleRate) / (2 * bufferLength);
    setDominantFrequency(dominantFreq);
    setPeakAmplitude(maxAmplitude + 140); // Normalize amplitude

    // Store analysis data
    setAudioAnalysis(prev => [...prev, {
      frequency: dominantFreq,
      amplitude: maxAmplitude + 140,
      timestamp: currentTime
    }].slice(-100)); // Keep last 100 samples

    requestAnimationFrame(analyzeAudio);
  };

  const startAnalysis = async () => {
    try {
      await initializeAudioContext();
      setRemixProgress(0);

      // Define musical scales and their corresponding chord progressions
      const scales = {
        cMajor: {
          notes: [60, 62, 64, 65, 67, 69, 71, 72], // C4 to C5
          chords: [
            [60, 64, 67], // C major (I)
            [67, 71, 74], // G major (V)
            [65, 69, 72], // F major (IV)
            [60, 64, 67]  // C major (I)
          ]
        },
        cMinor: {
          notes: [60, 62, 63, 65, 67, 68, 70, 72], // C minor
          chords: [
            [60, 63, 67], // C minor (i)
            [67, 70, 74], // G minor (v)
            [65, 68, 72], // F minor (iv)
            [60, 63, 67]  // C minor (i)
          ]
        },
        pentatonic: {
          notes: [60, 62, 64, 67, 69, 72], // C pentatonic
          chords: [
            [60, 64, 67], // C major
            [62, 67, 71], // D minor
            [64, 67, 71], // E minor
            [60, 64, 67]  // C major
          ]
        }
      };

      // Choose a random scale
      const scaleNames = Object.keys(scales);
      const selectedScaleName = scaleNames[Math.floor(Math.random() * scaleNames.length)];
      const selectedScale = scales[selectedScaleName];

      // Generate random melody parameters
      const noteCount = Math.floor(Math.random() * 8) + 8; // 8-16 notes
      const tempo = Math.floor(Math.random() * 60) + 80; // 80-140 BPM
      Tone.Transport.bpm.value = tempo;

      // Define possible note durations (in seconds)
      const durations = [0.25, 0.5, 1]; // quarter, half, whole notes

      // Generate melody
      const newMelody = [];
      let newCurrentTime = 0;

      // Create multiple synths for chorus effect
      const chorusVoices = 3;
      const chorusDetune = 10; // cents
      
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      
      // Initialize new synth with chorus effect and volume controls
      const melodyGain = new Tone.Gain(melodyVolume).toDestination();
      const harmonyGain = new Tone.Gain(harmonyVolume).toDestination();
      const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(melodyGain);
      const reverb = new Tone.Reverb(1.5).connect(chorus);
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "sine8",  // Rich, warm tone with harmonics
          partials: [1, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05, 0.025]  // Alternative approach for piano-like timbre
        },
        envelope: {
          attack: 0.002,  // Quick attack for piano-like response
          decay: 0.2,     // Moderate decay
          sustain: 0.2,   // Lower sustain for piano-like character
          release: 1.8    // Longer release for natural piano decay
        }
      }).connect(reverb);

      // Generate melody with harmony
      for (let i = 0; i < noteCount; i++) {
        // Random note from scale
        const noteIndex = Math.floor(Math.random() * selectedScale.notes.length);
        const mainPitch = selectedScale.notes[noteIndex];

        // Get current chord based on position in melody
        const chordIndex = Math.floor((i / noteCount) * selectedScale.chords.length);
        const currentChord = selectedScale.chords[chordIndex];

        // Random duration
        const duration = durations[Math.floor(Math.random() * durations.length)];

        // Random velocity (volume)
        const velocity = Math.floor(Math.random() * 30) + 70; // 70-100

        // Add main melody note
        newMelody.push({
          pitch: mainPitch as number,
          startTime: newCurrentTime,
          duration: duration,
          velocity: velocity,
          active: false
        });

        // Add harmony notes from current chord
        currentChord.forEach(harmonicPitch => {
          if (harmonicPitch !== mainPitch) {
            newMelody.push({
              pitch: harmonicPitch,
              startTime: newCurrentTime,
              duration,
              velocity: velocity * 0.7 // Slightly quieter harmony
            });
          }
        });

        newCurrentTime += duration;
        setRemixProgress(Math.floor((i / noteCount) * 100));
      }

      // Update melody and currentTime states
      setMelody(newMelody);
      setCurrentTime(newCurrentTime);

      // Play the generated melody with harmony
      const synth = synthRef.current;
      if (synth) {
        Tone.Transport.cancel();
        Tone.Transport.stop();

        // Add slight random timing variations for chorus effect with separate volume controls
        newMelody.forEach((note) => {
          const startTime = Tone.now() + (note.startTime as number);
          const endTime = startTime + note.duration;

          // Schedule note activation/deactivation for visualization
          Tone.Transport.schedule(() => {
            setMelody(prev => prev.map(n => 
              n === note ? { ...n, active: true } : n
            ));
          }, startTime);

          Tone.Transport.schedule(() => {
            setMelody(prev => prev.map(n => 
              n === note ? { ...n, active: false } : n
            ));
          }, endTime);

          for (let voice = 0; voice < chorusVoices; voice++) {
            const timeVariation = (Math.random() - 0.5) * 0.02;
            const detuneAmount = (Math.random() - 0.5) * chorusDetune;
            
            if (note.velocity && note.velocity === note.velocity * 0.7) { // Harmony notes
              synth.connect(harmonyGain);
            } else { // Melody notes
              synth.connect(melodyGain);
            }

            synth.triggerAttackRelease(
              Tone.Frequency(note.pitch, 'midi').toFrequency(),
              note.duration,
              startTime + timeVariation,
              note.velocity / 100
            );
          }
        });

        Tone.Transport.start();

        await Tone.start();
      }

      setRemixProgress(100);
    } catch (error) {
      console.error('Error generating melody:', error);
      setRemixProgress(0);
    }
  };
  
  // Helper function to detect pitch in an audio chunk
  const detectPitch = (audioData: Float32Array, sampleRate: number) => {
    // Simple zero-crossing rate pitch detection
    let zeroCrossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if (audioData[i] * audioData[i - 1] < 0) {
        zeroCrossings++;
      }
    }
    
    // Calculate frequency from zero-crossings
    const frequency = (zeroCrossings * sampleRate) / (2 * audioData.length);
    
    // Convert frequency to MIDI pitch
    if (frequency > 0) {
      const midiPitch = Math.round(69 + 12 * Math.log2(frequency / 440));
      
      // Ensure pitch is within valid MIDI range (0-127)
      if (midiPitch >= 0 && midiPitch <= 127) {
        return midiPitch;
      }
    }
    
    return null;
  };

  return (
    <div className="app">
      <div className="header">
        <h1>AI Music Remixer</h1>
        <p>Transform your music with AI-powered remixing</p>
      </div>

      <div className="main-content">
        <div className="upload-section">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="file-input"
          />
        </div>

        <div className="waveform-container" ref={waveformRef} />

        <div className="visualization-container">
          <div id="spectrogram" className="spectrogram-container" />
          
          <div className="analysis-visualization">
            {audioAnalysis.map((data, index) => (
              <div
                key={index}
                className="analysis-bar"
                style={{
                  left: `${(index / audioAnalysis.length) * 100}%`,
                  height: `${(data.amplitude / 140) * 100}%`,
                  backgroundColor: `hsl(${(data.frequency % 360)}, 70%, 50%)`
                }}
              />
            ))}
          </div>

          <div className="audio-metrics">
            <div className="metric">
              <span>Dominant Frequency:</span>
              <span>{dominantFrequency.toFixed(2)} Hz</span>
            </div>
            <div className="metric">
              <span>Peak Amplitude:</span>
              <span>{peakAmplitude.toFixed(2)} dB</span>
            </div>
          </div>
        </div>

        <div className="controls">
          <button
            className={`control-button ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <div className="audio-controls">
            <button
              className="analyze-button"
              onClick={startAnalysis}
              disabled={!audioFile}
            >
              Analyze Audio
            </button>
          </div>
          <button
            className="remix-button"
            onClick={generateMelody}
            disabled={!audioFile}
          >
            Generate Melody
          </button>
        </div>

        {remixProgress > 0 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${remixProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;