import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    },
    role: {
      type: String,
      enum: ['caller', 'receiver', 'participant'],
      default: 'participant'
    }
  }],
  callType: {
    type: String,
    enum: ['video', 'audio', 'screen-share'],
    required: true
  },
  status: {
    type: String,
    enum: ['ringing', 'active', 'ended', 'declined', 'failed'],
    default: 'ringing'
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // Duration in milliseconds
    default: 0
  },
  quality: {
    averageLatency: Number,
    packetLoss: Number,
    bandwidthUsed: Number,
    resolution: String
  },
  recording: {
    enabled: {
      type: Boolean,
      default: false
    },
    filePath: String,
    fileSize: Number,
    duration: Number
  },
  endReason: {
    type: String,
    enum: ['normal', 'declined', 'timeout', 'error', 'network-failure', 'peer-disconnected'],
    default: 'normal'
  },
  metadata: {
    userAgent: String,
    platform: String,
    networkType: String,
    location: {
      country: String,
      city: String
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
callSchema.index({ participants: 1 });
callSchema.index({ startTime: -1 });
callSchema.index({ status: 1 });
callSchema.index({ roomId: 1 });

// Virtual field for formatted duration
callSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  const minutes = Math.floor(this.duration / (1000 * 60));
  const seconds = Math.floor((this.duration % (1000 * 60)) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to add participant
callSchema.methods.addParticipant = function(userId, role = 'participant') {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date()
    });
  }
  return this.save();
};

// Method to remove participant
callSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.leftAt = new Date();
  }
  return this.save();
};

// Static method to get user's call history
callSchema.statics.getUserCallHistory = function(userId, limit = 50, skip = 0) {
  return this.find({
    'participants.user': userId
  })
  .populate('participants.user', 'fullname email')
  .sort({ startTime: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get active calls for user
callSchema.statics.getActiveCalls = function(userId) {
  return this.find({
    'participants.user': userId,
    status: { $in: ['ringing', 'active'] }
  }).populate('participants.user', 'fullname email');
};

const Call = mongoose.model("Call", callSchema);
export default Call;
