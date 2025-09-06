import React from 'react';
import { FaVideo, FaPhone } from 'react-icons/fa';

const SimpleCallButtons = ({ userId, userName, isOnline = false }) => {
  const handleVideoCall = () => {
    console.log(`Video calling ${userName}`);
  };

  const handleVoiceCall = () => {
    console.log(`Voice calling ${userName}`);
  };

  if (!isOnline) {
    return null; // Don't show buttons if user is offline
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleVideoCall}
        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
        title={`Video call ${userName}`}
      >
        <FaVideo size={16} />
      </button>

      <button
        onClick={handleVoiceCall}
        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
        title={`Voice call ${userName}`}
      >
        <FaPhone size={16} />
      </button>
    </div>
  );
};

export default SimpleCallButtons;
