import React, { useEffect, useState } from 'react';
import { useWebRTC } from '../../context/NativeWebRTCContext';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaDesktop, FaPhone, FaExpand, FaCompress, FaCog, FaComment } from 'react-icons/fa';
import { MdCallEnd, MdScreenShare, MdStopScreenShare } from 'react-icons/md';

const VideoCallInterface = () => {
  const {
    localStream,
    remoteStream,
    isCallActive,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    connectionState,
    localVideoRef,
    remoteVideoRef,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall
  } = useWebRTC();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Timer for call duration
  useEffect(() => {
    let interval;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  // Auto-hide controls
  useEffect(() => {
    if (isCallActive) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isCallActive]);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle mouse movement to show controls
  const handleMouseMove = () => {
    setShowControls(true);
  };

  if (!isCallActive) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* Remote Video */}
      <div className="relative w-full h-full">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
        />
        
        {/* Connection Status */}
        {connectionState !== 'connected' && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
            {connectionState === 'connecting' ? 'Connecting...' : 'Connection Lost'}
          </div>
        )}

        {/* Call Duration */}
        {isCallActive && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {formatDuration(callDuration)}
          </div>
        )}

        {/* Debug Info - Mobile Responsive */}
        <div className="absolute top-16 left-4 md:top-20 md:right-4 md:left-auto bg-black bg-opacity-70 text-white p-2 rounded text-xs max-w-xs">
          <div>Local: {localStream ? '✅' : '❌'}</div>
          <div>Remote: {remoteStream ? '✅' : '❌'}</div>
          <div>Audio: {isAudioEnabled ? '🔊' : '🔇'}</div>
          <div>Video: {isVideoEnabled ? '📹' : '📷'}</div>
          <div>Status: {connectionState}</div>
          {localStream && (
            <div>
              <div>A: {localStream.getAudioTracks().length}</div>
              <div>V: {localStream.getVideoTracks().length}</div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) - Mobile Responsive */}
        <div className="absolute top-4 right-4 w-32 h-24 md:w-48 md:h-32 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
              <FaVideoSlash className="text-white text-xl md:text-2xl" />
            </div>
          )}
        </div>

        {/* Screen Share Indicator */}
        {isScreenSharing && (
          <div className="absolute bottom-20 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
            <MdScreenShare className="mr-2" />
            Sharing Screen
          </div>
        )}

        {/* Controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-gradient-to-t from-black via-black/50 to-transparent p-4 md:p-6">
            <div className="flex justify-center items-center space-x-2 md:space-x-4">
              {/* Audio Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-3 md:p-4 rounded-full transition-colors ${
                  isAudioEnabled 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                title={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {isAudioEnabled ? <FaMicrophone size={16} className="md:w-5 md:h-5" /> : <FaMicrophoneSlash size={16} className="md:w-5 md:h-5" />}
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-3 md:p-4 rounded-full transition-colors ${
                  isVideoEnabled 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <FaVideo size={16} className="md:w-5 md:h-5" /> : <FaVideoSlash size={16} className="md:w-5 md:h-5" />}
              </button>

              {/* Screen Share Toggle - Hidden on mobile */}
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={`hidden md:block p-3 md:p-4 rounded-full transition-colors ${
                  isScreenSharing 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                {isScreenSharing ? <MdStopScreenShare size={16} className="md:w-5 md:h-5" /> : <MdScreenShare size={16} className="md:w-5 md:h-5" />}
              </button>

              {/* Chat Toggle - Hidden on mobile */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`hidden md:block p-3 md:p-4 rounded-full transition-colors ${
                  showChat 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Toggle chat"
              >
                <FaComment size={16} className="md:w-5 md:h-5" />
              </button>

              {/* Settings - Hidden on mobile */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="hidden md:block p-3 md:p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                title="Settings"
              >
                <FaCog size={16} className="md:w-5 md:h-5" />
              </button>

              {/* Fullscreen Toggle - Hidden on mobile */}
              <button
                onClick={toggleFullscreen}
                className="hidden md:block p-3 md:p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <FaCompress size={16} className="md:w-5 md:h-5" /> : <FaExpand size={16} className="md:w-5 md:h-5" />}
              </button>

              {/* End Call */}
              <button
                onClick={endCall}
                className="p-3 md:p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                title="End call"
              >
                <MdCallEnd size={16} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg p-4 w-80">
            <h3 className="font-semibold mb-4">Call Settings</h3>
            
            {/* Audio Settings */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Audio Input</label>
              <select className="w-full p-2 border rounded">
                <option>Default Microphone</option>
              </select>
            </div>

            {/* Video Settings */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Video Input</label>
              <select className="w-full p-2 border rounded">
                <option>Default Camera</option>
              </select>
            </div>

            {/* Quality Settings */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Video Quality</label>
              <select className="w-full p-2 border rounded">
                <option value="high">High (720p)</option>
                <option value="medium">Medium (480p)</option>
                <option value="low">Low (240p)</option>
              </select>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-lg">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="text-center text-gray-500 mt-8">
                Chat during call feature coming soon...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallInterface;
