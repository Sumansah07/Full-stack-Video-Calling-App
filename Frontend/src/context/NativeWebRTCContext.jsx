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

  // Monitor local stream state
  useEffect(() => {
    if (localStream) {
      console.log('Local stream state changed:', {
        audioTracks: localStream.getAudioTracks().length,
        videoTracks: localStream.getVideoTracks().length,
        active: localStream.active
      });
      
      // Check if stream is still active
      const checkStreamHealth = () => {
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          const videoTracks = localStream.getVideoTracks();
          
          audioTracks.forEach(track => {
            if (track.readyState === 'ended') {
              console.error('Audio track ended! This will cause one-sided audio.');
            }
          });
          
          videoTracks.forEach(track => {
            if (track.readyState === 'ended') {
              console.error('Video track ended! This will cause one-sided video.');
            }
          });
        }
      };
      
      // Check stream health every 2 seconds during call
      const healthInterval = setInterval(checkStreamHealth, 2000);
      
      return () => clearInterval(healthInterval);
    }
  }, [localStream]);

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

      // Handle remote stream - CRITICAL FIX for bidirectional audio
      pc.ontrack = (event) => {
        console.log('🎯 RECEIVED REMOTE TRACK:', event.track.kind, 'enabled:', event.track.enabled, 'readyState:', event.track.readyState);
        const [stream] = event.streams;
        
        if (stream) {
          console.log('🎯 Setting remote stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
          setRemoteStream(stream);
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.muted = false; // CRITICAL: Remote should NOT be muted
            
            // Force play with user interaction handling
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                console.log('Auto-play prevented, will play on user interaction');
                // Add click handler to play on user interaction
                const playOnClick = () => {
                  remoteVideoRef.current.play();
                  document.removeEventListener('click', playOnClick);
                };
                document.addEventListener('click', playOnClick);
              });
            }
          }
          
          // Ensure all remote tracks are enabled
          stream.getTracks().forEach(track => {
            console.log('🎯 Remote track:', track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState);
            track.enabled = true;
          });
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
            console.log('🔥 CALLER: Call answered - setting remote description');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallRoom(data.roomId);
            sendPendingIceCandidates(data.roomId);
            
            // CRITICAL FIX: Verify caller's tracks are still active and sending
            if (localStream && peerConnection) {
              console.log('🔥 CALLER: Verifying local stream after answer');
              
              const senders = peerConnection.getSenders();
              console.log('🔥 CALLER: Current senders:', senders.length);
              
              // Log all current senders
              senders.forEach((sender, index) => {
                if (sender.track) {
                  console.log(`🔥 CALLER: Sender ${index}:`, sender.track.kind, 'enabled:', sender.track.enabled, 'readyState:', sender.track.readyState);
                } else {
                  console.log(`🔥 CALLER: Sender ${index}: NO TRACK`);
                }
              });
              
              // Verify local stream tracks are still active
              localStream.getTracks().forEach(track => {
                console.log('🔥 CALLER: Local track status:', track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState);
                if (track.readyState === 'ended') {
                  console.error('🔥 CALLER: LOCAL TRACK ENDED! This causes one-sided audio!');
                }
              });
            }
            
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
        console.log('Call started event received, roomId:', data.roomId);
        setIsCallActive(true);
        setCallRoom(data.roomId);
        setIsIncomingCall(false);
        
        // Ensure caller's local stream is still active and connected
        if (localStream && peerConnection) {
          console.log('Caller: Verifying local stream tracks are still active');
          const audioTracks = localStream.getAudioTracks();
          const videoTracks = localStream.getVideoTracks();
          
          audioTracks.forEach(track => {
            console.log('Caller audio track status:', track.id, 'enabled:', track.enabled, 'readyState:', track.readyState);
            if (track.readyState === 'ended') {
              console.error('Caller audio track ended unexpectedly!');
            }
          });
          
          videoTracks.forEach(track => {
            console.log('Caller video track status:', track.id, 'enabled:', track.enabled, 'readyState:', track.readyState);
            if (track.readyState === 'ended') {
              console.error('Caller video track ended unexpectedly!');
            }
          });
        }
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

      // Handle peer audio/video toggle events
      socket.on('peer-audio-toggled', (data) => {
        console.log('Peer audio toggled:', data.muted);
        // You can show UI indicators here if needed
      });

      socket.on('peer-video-toggled', (data) => {
        console.log('Peer video toggled:', data.videoOff);
        // You can show UI indicators here if needed
      });

      // Handle peer disconnection
      socket.on('peer-disconnected', (data) => {
        console.log('Peer disconnected:', data.userId);
        toast.warning('Peer disconnected');
        endCall();
      });

      return () => {
        // Clean up event listeners
        socket.off('incoming-call');
        socket.off('call-answered');
        socket.off('call-declined');
        socket.off('call-started');
        socket.off('call-ended');
        socket.off('ice-candidate');
        socket.off('peer-audio-toggled');
        socket.off('peer-video-toggled');
        socket.off('peer-disconnected');
      };
    }
  }, [socket, peerConnection, callRoom]);

  // Get user media - CRITICAL FIX for persistent streams
  const getUserMedia = async (constraints = { video: true, audio: true }) => {
    try {
      console.log('🎤 Requesting user media with constraints:', constraints);
      
      // CRITICAL FIX: Use more specific constraints to ensure compatibility
      const enhancedConstraints = {
        video: constraints.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: constraints.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(enhancedConstraints);
      
      console.log('🎤 Got media stream - ID:', stream.id, 'Active:', stream.active);
      console.log('🎤 Audio tracks:', stream.getAudioTracks().length, 'Video tracks:', stream.getVideoTracks().length);
      
      // CRITICAL FIX: Ensure tracks are properly configured and monitored
      stream.getTracks().forEach(track => {
        console.log(`🎤 Track: ${track.kind}, ID: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
        // Ensure track is enabled
        track.enabled = true;
        
        // Add comprehensive event listeners
        track.addEventListener('ended', () => {
          console.error(`🚨 ${track.kind.toUpperCase()} TRACK ENDED! This will cause one-sided media!`);
        });
        
        track.addEventListener('mute', () => {
          console.warn(`🔇 ${track.kind} track muted`);
        });
        
        track.addEventListener('unmute', () => {
          console.log(`🔊 ${track.kind} track unmuted`);
        });
      });
      
      // CRITICAL FIX: Store stream reference and set up monitoring
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Prevent feedback
        
        // Ensure video plays
        localVideoRef.current.play().catch(e => {
          console.log('Local video autoplay prevented');
        });
      }
      
      console.log('🎤 Local stream set successfully');
      return stream;
      
    } catch (error) {
      console.error('🚨 Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone: ' + error.message);
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

      console.log('🔥 CALLER: Starting call initiation process');

      // CRITICAL FIX: Get user media FIRST and ensure it's working
      const stream = await getUserMedia({
        video: callType === 'video',
        audio: true // Simplified - just ensure audio works
      });

      console.log('🔥 CALLER: Got media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));

      // CRITICAL FIX: Ensure we have working audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available');
      }

      // Create peer connection AFTER we have confirmed working media
      const pc = createPeerConnection();
      setPeerConnection(pc);

      // CRITICAL FIX: Add tracks with explicit stream reference
      stream.getTracks().forEach(track => {
        console.log('🔥 CALLER: Adding track:', track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState);
        const sender = pc.addTrack(track, stream);
        console.log('🔥 CALLER: Track added, sender:', !!sender);
      });

      // Wait a moment for tracks to be properly added
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('🔥 CALLER: Created offer, sending to server');

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
        console.log('🔥 RECEIVER: Starting call answer process');

        // CRITICAL FIX: Get user media FIRST and ensure it's working
        const stream = await getUserMedia({
          video: incomingCallData.callType === 'video',
          audio: true // Simplified - just ensure audio works
        });

        console.log('🔥 RECEIVER: Got media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));

        // CRITICAL FIX: Ensure we have working audio
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('No audio track available');
        }

        // Create peer connection AFTER we have confirmed working media
        const pc = createPeerConnection();
        setPeerConnection(pc);

        // Set call room immediately
        setCallRoom(incomingCallData.roomId);
        sendPendingIceCandidates(incomingCallData.roomId);

        // CRITICAL FIX: Set remote description FIRST (the offer)
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer));
        console.log('🔥 RECEIVER: Set remote description (offer)');

        // CRITICAL FIX: Add tracks AFTER setting remote description
        stream.getTracks().forEach(track => {
          console.log('🔥 RECEIVER: Adding track:', track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState);
          const sender = pc.addTrack(track, stream);
          console.log('🔥 RECEIVER: Track added, sender:', !!sender);
        });

        // Wait a moment for tracks to be properly added
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('🔥 RECEIVER: Created answer and set local description');

        // Send answer
        socket?.emit('answer-call', {
          roomId: incomingCallData.roomId,
          answer: answer,
          accepted: true
        });

        console.log('🔥 RECEIVER: Sent answer to server');
        setIsIncomingCall(false);

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
    console.log('Toggle audio called, localStream exists:', !!localStream);
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      console.log('Audio track found:', !!audioTrack, audioTrack ? `enabled: ${audioTrack.enabled}` : 'none');
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled to:', audioTrack.enabled);
        socket?.emit('toggle-audio', {
          roomId: callRoom,
          muted: !audioTrack.enabled
        });
      } else {
        console.error('No audio track found in local stream');
      }
    } else {
      console.error('No local stream available for audio toggle');
    }
  };

  // Toggle video
  const toggleVideo = () => {
    console.log('Toggle video called, localStream exists:', !!localStream);
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      console.log('Video track found:', !!videoTrack, videoTrack ? `enabled: ${videoTrack.enabled}` : 'none');
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled to:', videoTrack.enabled);
        socket?.emit('toggle-video', {
          roomId: callRoom,
          videoOff: !videoTrack.enabled
        });
      } else {
        console.error('No video track found in local stream');
      }
    } else {
      console.error('No local stream available for video toggle');
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