import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const AudioTest = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [stream, setStream] = useState(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const startAudioTest = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      setStream(mediaStream);
      setIsRecording(true);

      // Create audio context for level monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Monitor audio levels
      const monitorAudio = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        
        animationRef.current = requestAnimationFrame(monitorAudio);
      };
      
      monitorAudio();

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone: ' + error.message);
    }
  };

  const stopAudioTest = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      stopAudioTest();
    };
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Microphone Test</h3>
      
      <div className="text-center mb-4">
        <button
          onClick={isRecording ? stopAudioTest : startAudioTest}
          className={`p-4 rounded-full transition-colors ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          {isRecording ? 'Speak into your microphone' : 'Click to test microphone'}
        </div>
        
        {/* Audio Level Indicator */}
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-100 ${
              audioLevel > 50 ? 'bg-green-500' : 
              audioLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          Audio Level: {Math.round(audioLevel)}
        </div>
      </div>

      {isRecording && (
        <div className="text-sm text-green-600">
          ✓ Microphone is working! You should see the level bar move when you speak.
        </div>
      )}
    </div>
  );
};

export default AudioTest;