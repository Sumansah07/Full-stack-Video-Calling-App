import { Server } from "socket.io";
import http from "http";
import express from "express";
import { v4 as uuidv4 } from 'uuid';

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:4002", 
      "http://localhost:3000", 
      "http://localhost:3001", 
      "http://localhost:3002", 
      "http://localhost:3003", 
      "http://localhost:5173",
      "https://full-stack-video-calling-app.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// realtime message code goes here
export const getReceiverSocketId = (receiverId) => {
  return users[receiverId];
};

const users = {}; // Keep original format for compatibility: userId -> socketId
const userDetails = {}; // Extended details for WebRTC: userId -> {status, lastSeen, inCall, callRoom}
const activeRooms = {}; // Track active call rooms
const callHistory = {}; // Store call session info

// used to listen events on server side.
io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    // Keep original format for chat compatibility
    users[userId] = socket.id;
    
    // Store extended details for WebRTC
    userDetails[userId] = {
      status: 'online',
      lastSeen: new Date(),
      inCall: false,
      callRoom: null
    };
    
    // Update user status in database
    try {
      const User = (await import('../models/user.model.js')).default;
      await User.findByIdAndUpdate(userId, { 
        status: 'online',
        lastSeen: new Date()
      });
    } catch (error) {
      // Error updating user status - handle silently
    }
  }
  
  // used to send the events to all connected users
  io.emit("getOnlineUsers", Object.keys(users));
  
  // Video Call Signaling Events
  
  // Initiate a call
  socket.on("call-user", (data) => {
    const { to, from, callType, offer } = data;
    const roomId = uuidv4();
    
    // Create call room
    activeRooms[roomId] = {
      participants: [from, to],
      callType,
      startTime: new Date(),
      status: 'ringing'
    };
    
    const receiverSocket = users[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("incoming-call", {
        from,
        to,
        callType,
        roomId,
        offer,
        callerInfo: {
          userId: from,
          // Add caller details here if needed
        }
      });
      
      // Update user status
      if (userDetails[from]) userDetails[from].status = 'calling';
      if (userDetails[to]) userDetails[to].status = 'receiving-call';
      
      io.emit("getOnlineUsers", Object.keys(users));
    } else {
      socket.emit("call-failed", { reason: "User offline" });
    }
  });
  
  // Answer a call
  socket.on("answer-call", (data) => {
    const { roomId, answer, accepted } = data;
    
    if (activeRooms[roomId]) {
      const room = activeRooms[roomId];
      const [caller, receiver] = room.participants;
      const callerSocket = users[caller];
      
      if (accepted) {
        // Join both users to the room
        socket.join(roomId);
        if (callerSocket) {
          io.sockets.sockets.get(callerSocket)?.join(roomId);
        }
        
        room.status = 'active';
        room.acceptedAt = new Date();
        
        // Update user statuses
        if (userDetails[caller]) {
          userDetails[caller].status = 'in-call';
          userDetails[caller].inCall = true;
          userDetails[caller].callRoom = roomId;
        }
        if (userDetails[receiver]) {
          userDetails[receiver].status = 'in-call';
          userDetails[receiver].inCall = true;
          userDetails[receiver].callRoom = roomId;
        }
        
        if (callerSocket) {
          io.to(callerSocket).emit("call-answered", { roomId, answer });
        }
        
        io.to(roomId).emit("call-started", { roomId });
      } else {
        // Call declined
        if (callerSocket) {
          io.to(callerSocket).emit("call-declined", { roomId });
        }
        
        // Reset user statuses
        if (userDetails[caller]) userDetails[caller].status = 'online';
        if (userDetails[receiver]) userDetails[receiver].status = 'online';
        
        delete activeRooms[roomId];
      }
      
      io.emit("getOnlineUsers", Object.keys(users));
    }
  });
  
  // Handle ICE candidates
  socket.on("ice-candidate", (data) => {
    const { roomId, candidate } = data;
    socket.to(roomId).emit("ice-candidate", { candidate });
  });
  
  // End call
  socket.on("end-call", (data) => {
    const { roomId } = data;
    
    if (activeRooms[roomId]) {
      const room = activeRooms[roomId];
      room.endTime = new Date();
      room.duration = room.endTime - (room.acceptedAt || room.startTime);
      room.status = 'ended';
      
      // Store call history
      callHistory[roomId] = { ...room };
      
      // Reset user statuses
      room.participants.forEach(participantId => {
        if (userDetails[participantId]) {
          userDetails[participantId].status = 'online';
          userDetails[participantId].inCall = false;
          userDetails[participantId].callRoom = null;
        }
      });
      
      io.to(roomId).emit("call-ended", { roomId });
      
      // Remove users from room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        socketsInRoom.forEach(socketId => {
          io.sockets.sockets.get(socketId)?.leave(roomId);
        });
      }
      
      delete activeRooms[roomId];
      io.emit("getOnlineUsers", Object.keys(users));
    }
  });
  
  // Handle call quality reports
  socket.on("call-quality", (data) => {
    const { roomId, quality } = data;
    socket.to(roomId).emit("peer-call-quality", { quality });
  });
  
  // Screen sharing events
  socket.on("start-screen-share", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("peer-screen-share-started", { userId });
  });
  
  socket.on("stop-screen-share", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("peer-screen-share-stopped", { userId });
  });
  
  // Mute/unmute events
  socket.on("toggle-audio", (data) => {
    const { roomId, muted } = data;
    socket.to(roomId).emit("peer-audio-toggled", { userId, muted });
  });
  
  socket.on("toggle-video", (data) => {
    const { roomId, videoOff } = data;
    socket.to(roomId).emit("peer-video-toggled", { userId, videoOff });
  });

  // used to listen client side events emitted by server side (server & client)
  socket.on("disconnect", async () => {
    
    // Handle user disconnection during call
    if (userId && userDetails[userId]?.inCall) {
      const roomId = userDetails[userId].callRoom;
      if (roomId && activeRooms[roomId]) {
        socket.to(roomId).emit("peer-disconnected", { userId });
        
        // If this was a 1-on-1 call, end it
        if (activeRooms[roomId].participants.length === 2) {
          socket.to(roomId).emit("call-ended", { roomId, reason: "peer-disconnected" });
          delete activeRooms[roomId];
        }
      }
    }
    
    // Update user status in database when disconnecting
    if (userId) {
      try {
        const User = (await import('../models/user.model.js')).default;
        await User.findByIdAndUpdate(userId, { 
          status: 'offline',
          lastSeen: new Date()
        });
      } catch (error) {
        // Error updating user status on disconnect - handle silently
      }
    }
    
    delete users[userId];
    delete userDetails[userId];
    io.emit("getOnlineUsers", Object.keys(users));
  });
});

// Utility functions for call management
export const getActiveRooms = () => activeRooms;
export const getCallHistory = () => callHistory;
export const getUserStatus = (userId) => userDetails[userId]?.status || 'offline';
export const isUserInCall = (userId) => userDetails[userId]?.inCall || false;

export { app, io, server, users };
