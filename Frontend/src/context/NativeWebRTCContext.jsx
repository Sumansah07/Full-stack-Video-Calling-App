import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSocketContext } from './SocketContext';
import { useAuth } from './AuthProvider';

const WebRTCContext = createContext();

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export const WebRTCProvider = ({ children }) => {
  const { socket } = useSocketContext();
  const [authUser] = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callRoom, setCallRoom] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pendingIceCandidates = useRef([]);

  // Send pending ICE candidates when room is established
  const sendPendingIceCandidates = (roomId) => {
    if (pendingIceCandidates.current.length > 0 && socket) {
      pendingIceCandidates.current.forEach(candidate => {
        socket.emit('ice-candidate', {
          roomId: roomId,
          candidate: candidate
        });
      });
      pendingIceCandidates.current = [];
    }
  };

  // Send pending ICE candidates when callRoom is set
  useEffect(() => {
    if (callRoom) {
      sendPendingIceCandidates(callRoom);
    }
  }, [callRoom, socket]);

  // ICE servers configuration with more STUN servers for better connectivity
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.services.mozilla.com' }
    ],
    iceCandidatePoolSize: 10
  };

  // Create peer connection
  const createPeerConnection = () => {
    try {
      const pc = new RTCPeerConnection(iceServers);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (socket && callRoom) {
            socket.emit('ice-candidate', {
              roomId: callRoom,
              candidate: event.candidate
            });
          } else {
            pendingIceCandidates.current.push(event.candidate);
          }
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);

        if (pc.connectionState === 'connected') {
          toast.success('Call connected');
        } else if (pc.connectionState === 'failed') {
          toast.error('Connection failed - attempting to reconnect');
          // Don't immediately end call, give it a chance to reconnect
          setTimeout(() => {
            if (pc.connectionState === 'failed') {
              toast.error('Connection lost - call ended');
              endCall();
            }
          }, 8000); // Wait 8 seconds before ending call
        } else if (pc.connectionState === 'disconnected') {
          // Only show warning if call was previously connected
          if (isCallActive) {
            toast.warning('Connection interrupted - trying to reconnect');
          }
          // Wait longer for disconnected state
          setTimeout(() => {
            if (pc.connectionState === 'disconnected' && isCallActive) {
              toast.error('Connection lost - call ended');
              endCall();
            }
          }, 15000); // Wait 15 seconds for disconnected state
        }
      };

      // Handle ICE connection state changes for more detailed monitoring
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          pc.restartIce();
        }
      };

      // Monitor connection quality
      const monitorConnection = () => {
        if (pc.connectionState === 'connected') {
          pc.getStats().then(stats => {
            stats.forEach(report => {
              if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                // Audio quality monitoring can be added here if needed
              }
            });
          }).catch(err => {
            // Stats collection error - can be handled silently
          });
        }
      };

      // Monitor connection every 5 seconds
      const statsInterval = setInterval(monitorConnection, 5000);

      // Clean up interval when connection closes
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'closed') {
          clearInterval(statsInterval);
        }
      });

      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  };

  // Set up WebRTC socket event listeners
  useEffect(() => {
    if (socket) {
      // Incoming call
      socket.on('incoming-call', (data) => {
        setIsIncomingCall(true);
        setIncomingCallData(data);
        toast.success(`Incoming ${data.callType} call from ${data.callerInfo?.name || 'Unknown'}`);
      });

      // Call answered
      socket.on('call-answered', async (data) => {
        if (peerConnection && data.answer) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallRoom(data.roomId);
            sendPendingIceCandidates(data.roomId);
            // Don't set isCallActive here - wait for 'call-started' event
          } catch (error) {
            console.error('Error setting remote description:', error);
            toast.error('Failed to establish connection');
            endCall();
          }
        }
      });

      // Call declined
      socket.on('call-declined', () => {
        toast.error('Call was declined');
        endCall();
      });

      // Call started
      socket.on('call-started', (data) => {
        setIsCallActive(true);
        setCallRoom(data.roomId);
        setIsIncomingCall(false);
      });

      // Call ended
      socket.on('call-ended', () => {
        toast.info('Call ended');
        endCall();
      });

      // ICE candidate
      socket.on('ice-candidate', async (data) => {
        if (peerConnection && data.candidate) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });

      return () => {
        // Clean up event listeners
        socket.off('incoming-call');
        socket.off('call-answered');
        socket.off('call-declined');
        socket.off('call-started');
        socket.off('call-ended');
        socket.off('ice-candidate');
      };
    }
  }, [socket, peerConnection, callRoom]);

  // Get user media
  const getUserMedia = async (constraints = { video: true, audio: true }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  };

  // Initialize call
  const initiateCall = async (userId, callType = 'video') => {
    try {
      if (!socket) {
        throw new Error('Socket not connected');
      }

      if (!authUser?.user?._id) {
        throw new Error('User not authenticated');
      }

      // Get user media
      const stream = await getUserMedia({
        video: callType === 'video',
        audio: true
      });

      // Create peer connection
      const pc = createPeerConnection();
      setPeerConnection(pc);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send call request
      socket.emit('call-user', {
        to: userId,
        from: authUser.user._id,
        callType,
        offer: offer,
        callerInfo: {
          name: authUser.user.name || authUser.user.username,
          id: authUser.user._id
        }
      });

      // Set timeout for call with better messaging
      const callTimeout = setTimeout(() => {
        if (!isCallActive && pc && pc.connectionState !== 'connected') {
          if (pc.connectionState === 'connecting') {
            toast.error('Call timeout - unable to connect');
          } else {
            toast.error('Call timeout - no response');
          }
          endCall();
        }
      }, 30000);

      // Clear timeout if call becomes active
      if (isCallActive) {
        clearTimeout(callTimeout);
      }

    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error(`Failed to initiate call: ${error.message}`);
      throw error;
    }
  };

  // Answer call
  const answerCall = async (accept = true) => {
    if (!incomingCallData) {
      console.error('No incoming call data');
      return;
    }

    if (accept) {
      try {
        // Get user media
        const stream = await getUserMedia({
          video: incomingCallData.callType === 'video',
          audio: true
        });

        // Create peer connection
        const pc = createPeerConnection();
        setPeerConnection(pc);

        // Set call room immediately
        setCallRoom(incomingCallData.roomId);
        sendPendingIceCandidates(incomingCallData.roomId);

        // Add local stream
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Set remote description (offer)
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer));

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer
        socket?.emit('answer-call', {
          roomId: incomingCallData.roomId,
          answer: answer,
          accepted: true
        });

        setIsIncomingCall(false);

        // Don't set isCallActive here - wait for 'call-started' event

      } catch (error) {
        console.error('Error answering call:', error);
        toast.error(`Failed to answer call: ${error.message}`);

        socket?.emit('answer-call', {
          roomId: incomingCallData.roomId,
          accepted: false,
          error: error.message
        });

        setIsIncomingCall(false);
        setIncomingCallData(null);
      }
    } else {
      // Decline call
      socket?.emit('answer-call', {
        roomId: incomingCallData.roomId,
        accepted: false
      });
      setIsIncomingCall(false);
      setIncomingCallData(null);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socket?.emit('toggle-audio', {
          roomId: callRoom,
          muted: !audioTrack.enabled
        });
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socket?.emit('toggle-video', {
          roomId: callRoom,
          videoOff: !videoTrack.enabled
        });
      }
    }
  };

  // End call
  const endCall = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Stop remote stream
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    // Emit end call event
    if (socket && callRoom) {
      socket.emit('end-call', { roomId: callRoom });
    }

    // Clear pending ICE candidates
    pendingIceCandidates.current = [];

    // Reset state
    setIsCallActive(false);
    setIsIncomingCall(false);
    setIncomingCallData(null);
    setCallRoom(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setConnectionState('disconnected');

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const value = {
    // State
    socket,
    localStream,
    remoteStream,
    peer: peerConnection,
    isCallActive,
    isIncomingCall,
    incomingCallData,
    callRoom,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    connectionState,

    // Refs
    localVideoRef,
    remoteVideoRef,

    // Methods
    getUserMedia,
    initiateCall,
    answerCall,
    endCall,
    toggleAudio,
    toggleVideo
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};