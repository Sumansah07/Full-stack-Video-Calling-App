import React, { useState } from 'react';
import { useWebRTC } from '../../context/NativeWebRTCContext';
import { FaVideo, FaPhone } from 'react-icons/fa';
import toast from 'react-hot-toast';

const CallButtons = ({ userId, userName, isOnline = false }) => {
  const { initiateCall, isCallActive } = useWebRTC();
  const [isInitiating, setIsInitiating] = useState(false);
  


  const handleVideoCall = async () => {

    if (!isOnline) {
      console.log('User is offline, cannot call');
      toast.error('User is offline');
      return;
    }

    if (isCallActive) {
      console.log('Already in call, cannot start new call');
      toast.error('You are already in a call');
      return;
    }

    try {
      console.log('Attempting to initiate video call...');
      setIsInitiating(true);
      await initiateCall(userId, 'video');
      toast.success(`Calling ${userName}...`);
    } catch (error) {
      console.error('Error initiating video call:', error);
      toast.error('Failed to start video call');
    } finally {
      setIsInitiating(false);
    }
  };

  const handleVoiceCall = async () => {
    if (!isOnline) {
      toast.error('User is offline');
      return;
    }

    if (isCallActive) {
      toast.error('You are already in a call');
      return;
    }

    try {
      setIsInitiating(true);
      await initiateCall(userId, 'audio');
      toast.success(`Calling ${userName}...`);
    } catch (error) {
      toast.error('Failed to start voice call');
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <div className="flex space-x-2">
      {/* Video Call Button */}
      <button
        onClick={handleVideoCall}
        disabled={!isOnline || isCallActive || isInitiating}
        className={`p-2 rounded-full transition-all duration-200 ${
          isOnline && !isCallActive && !isInitiating
            ? 'bg-green-500 hover:bg-green-600 text-white hover:shadow-lg transform hover:scale-105'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={
          !isOnline 
            ? 'User is offline' 
            : isCallActive 
            ? 'You are already in a call' 
            : `Video call ${userName}`
        }
      >
        <FaVideo size={16} />
      </button>

      {/* Voice Call Button */}
      <button
        onClick={handleVoiceCall}
        disabled={!isOnline || isCallActive || isInitiating}
        className={`p-2 rounded-full transition-all duration-200 ${
          isOnline && !isCallActive && !isInitiating
            ? 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg transform hover:scale-105'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={
          !isOnline 
            ? 'User is offline' 
            : isCallActive 
            ? 'You are already in a call' 
            : `Voice call ${userName}`
        }
      >
        <FaPhone size={16} />
      </button>

      {isInitiating && (
        <div className="flex items-center ml-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Connecting...</span>
        </div>
      )}
    </div>
  );
};

export default CallButtons;
