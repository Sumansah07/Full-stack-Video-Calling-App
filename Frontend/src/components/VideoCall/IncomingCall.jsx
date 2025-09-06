import React, { useEffect, useState } from 'react';
import { useWebRTC } from '../../context/NativeWebRTCContext';
import { FaVideo, FaPhone, FaPhoneSlash } from 'react-icons/fa';
import { MdCallEnd } from 'react-icons/md';

const IncomingCall = () => {
  const { 
    isIncomingCall, 
    incomingCallData, 
    answerCall 
  } = useWebRTC();
  
  const [ringAnimation, setRingAnimation] = useState(false);

  useEffect(() => {
    if (isIncomingCall) {
      setRingAnimation(true);
      // Play ring tone (you can add audio here)
      const interval = setInterval(() => {
        setRingAnimation(prev => !prev);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isIncomingCall]);

  if (!isIncomingCall || !incomingCallData) return null;

  const handleAccept = () => {
    answerCall(true);
  };

  const handleDecline = () => {
    answerCall(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Caller Info */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className={`w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4 ${ringAnimation ? 'animate-pulse' : ''}`}>
              {/* You can add user avatar here */}
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {incomingCallData.callerInfo?.name?.[0] || '?'}
              </div>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {incomingCallData.callerInfo?.name || 'Unknown Caller'}
          </h3>
          
          <p className="text-gray-600 mb-2">
            Incoming {incomingCallData.callType} call
          </p>
          
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${ringAnimation ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {incomingCallData.callType === 'video' ? <FaVideo className="mr-1" /> : <FaPhone className="mr-1" />}
            {incomingCallData.callType === 'video' ? 'Video Call' : 'Voice Call'}
          </div>
        </div>

        {/* Call Actions */}
        <div className="flex justify-center space-x-8">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
            title="Decline call"
          >
            <MdCallEnd size={24} />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors shadow-lg ${
              ringAnimation 
                ? 'bg-green-500 hover:bg-green-600 animate-bounce' 
                : 'bg-green-400 hover:bg-green-500'
            }`}
            title="Accept call"
          >
            {incomingCallData.callType === 'video' ? <FaVideo size={24} /> : <FaPhone size={24} />}
          </button>
        </div>

        {/* Call Type Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {incomingCallData.callType === 'video' 
              ? 'Video call will use your camera and microphone' 
              : 'Voice call will use your microphone'}
          </p>
        </div>
      </div>

      {/* Background Ring Animation */}
      <div className={`fixed inset-0 pointer-events-none ${ringAnimation ? 'animate-ping' : ''}`}>
        <div className="absolute inset-0 border-4 border-green-500 opacity-20 rounded-full transform scale-150"></div>
      </div>
    </div>
  );
};

export default IncomingCall;
