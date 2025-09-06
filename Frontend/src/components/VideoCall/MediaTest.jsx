import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

const MediaTest = () => {
  const [stream, setStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef();

  const startTest = async () => {
    try {
      setError(null);
      console.log('Starting media test...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      console.log('Got media stream:', {
        audioTracks: mediaStream.getAudioTracks().length,
        videoTracks: mediaStream.getVideoTracks().length,
        active: mediaStream.active
      });

      setStream(mediaStream);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Log track details
      mediaStream.getTracks().forEach(track => {
        console.log(`Track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
        track.addEventListener('ended', () => {
          console.log(`${track.kind} track ended`);
        });
      });

    } catch (err) {
      console.error('Error accessing media:', err);
      setError(err.message);
    }
  };

  const stopTest = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      setStream(null);
    }
    setIsActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled to:', audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled to:', videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Media Access Test</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-48 bg-gray-200 rounded object-cover"
        />
      </div>

      <div className="flex justify-center space-x-4 mb-4">
        {!isActive ? (
          <button
            onClick={startTest}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Test
          </button>
        ) : (
          <>
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${
                isAudioEnabled 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoEnabled 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
            </button>

            <button
              onClick={stopTest}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Stop Test
            </button>
          </>
        )}
      </div>

      {isActive && stream && (
        <div className="text-sm text-gray-600">
          <div>✅ Camera: {stream.getVideoTracks().length > 0 ? 'Working' : 'Not available'}</div>
          <div>✅ Microphone: {stream.getAudioTracks().length > 0 ? 'Working' : 'Not available'}</div>
          <div>Audio enabled: {isAudioEnabled ? 'Yes' : 'No'}</div>
          <div>Video enabled: {isVideoEnabled ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default MediaTest;