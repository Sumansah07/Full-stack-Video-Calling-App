import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import { getActiveRooms, getCallHistory as getMemoryCallHistory, getUserStatus, isUserInCall } from "../SocketIO/server.js";

// Get user's call history
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, callType, status } = req.query;
    
    const query = {
      'participants.user': userId
    };
    
    if (callType) {
      query.callType = callType;
    }
    
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    const calls = await Call.find(query)
      .populate('participants.user', 'fullname email avatar')
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Call.countDocuments(query);
    
    res.status(200).json({
      calls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalCalls: total,
        hasNext: skip + calls.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error in getCallHistory:", error);
    res.status(500).json({ error: "Failed to fetch call history" });
  }
};

// Get active calls
export const getActiveCalls = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get from database
    const dbActiveCalls = await Call.getActiveCalls(userId);
    
    // Get from memory (current active rooms)
    const activeRooms = getActiveRooms();
    const userActiveRooms = Object.values(activeRooms).filter(room => 
      room.participants.includes(userId.toString())
    );
    
    res.status(200).json({
      activeCalls: dbActiveCalls,
      activeRooms: userActiveRooms
    });
  } catch (error) {
    console.error("Error in getActiveCalls:", error);
    res.status(500).json({ error: "Failed to fetch active calls" });
  }
};

// Create a new call record
export const createCall = async (req, res) => {
  try {
    const { participants, callType, roomId } = req.body;
    const callerId = req.user._id;
    
    // Validate participants
    const validParticipants = await User.find({
      _id: { $in: participants }
    }).select('_id');
    
    if (validParticipants.length !== participants.length) {
      return res.status(400).json({ error: "Invalid participants" });
    }
    
    const call = new Call({
      roomId,
      participants: participants.map((userId, index) => ({
        user: userId,
        role: userId === callerId.toString() ? 'caller' : 'receiver'
      })),
      callType,
      startTime: new Date(),
      status: 'ringing'
    });
    
    await call.save();
    await call.populate('participants.user', 'fullname email avatar');
    
    res.status(201).json({
      message: "Call created successfully",
      call
    });
  } catch (error) {
    console.error("Error in createCall:", error);
    res.status(500).json({ error: "Failed to create call" });
  }
};

// Update call status or metadata
export const updateCall = async (req, res) => {
  try {
    const { roomId } = req.params;
    const updates = req.body;
    const userId = req.user._id;
    
    const call = await Call.findOne({ roomId });
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }
    
    // Check if user is participant
    const isParticipant = call.participants.some(p => 
      p.user.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to update this call" });
    }
    
    // Update allowed fields
    const allowedUpdates = ['status', 'endTime', 'duration', 'quality', 'endReason', 'acceptedAt'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        call[key] = updates[key];
      }
    });
    
    // Calculate duration if ending call
    if (updates.status === 'ended' && call.acceptedAt) {
      call.endTime = new Date();
      call.duration = call.endTime - call.acceptedAt;
    }
    
    await call.save();
    await call.populate('participants.user', 'fullname email avatar');
    
    // Update user call stats
    if (updates.status === 'ended') {
      await updateUserCallStats(call);
    }
    
    res.status(200).json({
      message: "Call updated successfully",
      call
    });
  } catch (error) {
    console.error("Error in updateCall:", error);
    res.status(500).json({ error: "Failed to update call" });
  }
};

// Get call analytics/stats
export const getCallStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query; // 7d, 30d, 90d, all
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter.startTime = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case '30d':
        dateFilter.startTime = { $gte: new Date(now.setDate(now.getDate() - 30)) };
        break;
      case '90d':
        dateFilter.startTime = { $gte: new Date(now.setDate(now.getDate() - 90)) };
        break;
      default:
        break; // all time
    }
    
    const matchStage = {
      'participants.user': userId,
      ...dateFilter
    };
    
    const stats = await Call.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' },
          videoCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'video'] }, 1, 0] }
          },
          audioCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'audio'] }, 1, 0] }
          },
          completedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] }
          },
          declinedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const callsByDay = await Call.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
          },
          count: { $sum: 1 },
          duration: { $sum: '$duration' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      stats: stats[0] || {
        totalCalls: 0,
        totalDuration: 0,
        avgDuration: 0,
        videoCalls: 0,
        audioCalls: 0,
        completedCalls: 0,
        declinedCalls: 0
      },
      dailyStats: callsByDay
    });
  } catch (error) {
    console.error("Error in getCallStats:", error);
    res.status(500).json({ error: "Failed to fetch call statistics" });
  }
};

// Update user presence/status
export const updateUserStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, customStatus } = req.body;
    
    const updateData = { lastSeen: new Date() };
    
    if (status) {
      updateData.status = status;
    }
    
    if (customStatus) {
      updateData.customStatus = customStatus;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');
    
    res.status(200).json({
      message: "Status updated successfully",
      user
    });
  } catch (error) {
    console.error("Error in updateUserStatus:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

// Get user call preferences
export const getCallPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('callPreferences deviceInfo');
    
    res.status(200).json({
      preferences: user.callPreferences,
      deviceInfo: user.deviceInfo
    });
  } catch (error) {
    console.error("Error in getCallPreferences:", error);
    res.status(500).json({ error: "Failed to fetch call preferences" });
  }
};

// Update user call preferences
export const updateCallPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { callPreferences, deviceInfo } = req.body;
    
    const updateData = {};
    if (callPreferences) updateData.callPreferences = callPreferences;
    if (deviceInfo) updateData.deviceInfo = deviceInfo;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('callPreferences deviceInfo');
    
    res.status(200).json({
      message: "Preferences updated successfully",
      preferences: user.callPreferences,
      deviceInfo: user.deviceInfo
    });
  } catch (error) {
    console.error("Error in updateCallPreferences:", error);
    res.status(500).json({ error: "Failed to update call preferences" });
  }
};

// Get current online users with their status
export const getOnlineUsers = async (req, res) => {
  try {
    const currentUser = req.user._id;
    
    // Get users who are currently online (you might want to implement a more sophisticated approach)
    const onlineUsers = await User.find({
      _id: { $ne: currentUser },
      status: { $in: ['online', 'away', 'busy', 'in-call'] },
      lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Active in last 5 minutes
    }).select('fullname email avatar status customStatus lastSeen callPreferences.showOnlineStatus');
    
    // Filter users who allow showing online status
    const visibleUsers = onlineUsers.filter(user => 
      user.callPreferences?.showOnlineStatus !== false
    );
    
    res.status(200).json({
      users: visibleUsers,
      count: visibleUsers.length
    });
  } catch (error) {
    console.error("Error in getOnlineUsers:", error);
    res.status(500).json({ error: "Failed to fetch online users" });
  }
};

// Helper function to update user call statistics
async function updateUserCallStats(call) {
  try {
    for (const participant of call.participants) {
      const user = await User.findById(participant.user);
      if (user && call.status === 'ended' && call.duration > 0) {
        user.callStats.totalCalls += 1;
        user.callStats.totalCallTime += call.duration;
        user.callStats.averageCallDuration = user.callStats.totalCallTime / user.callStats.totalCalls;
        user.callStats.lastCallDate = call.endTime;
        await user.save();
      }
    }
  } catch (error) {
    console.error("Error updating user call stats:", error);
  }
}
