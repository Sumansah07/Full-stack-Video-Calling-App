import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    fullname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    confirmPassword: {
        type: String,
    },
    avatar: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away', 'busy', 'in-call', 'do-not-disturb'],
        default: 'offline'
    },
    customStatus: {
        message: {
            type: String,
            maxLength: 100
        },
        emoji: String,
        expiresAt: Date
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    callPreferences: {
        allowCalls: {
            type: Boolean,
            default: true
        },
        allowVideoRequests: {
            type: Boolean,
            default: true
        },
        allowScreenShare: {
            type: Boolean,
            default: true
        },
        autoDeclineWhenBusy: {
            type: Boolean,
            default: false
        },
        showOnlineStatus: {
            type: Boolean,
            default: true
        },
        recordCalls: {
            type: Boolean,
            default: false
        }
    },
    deviceInfo: {
        lastLoginDevice: String,
        supportedFeatures: {
            video: { type: Boolean, default: true },
            audio: { type: Boolean, default: true },
            screenShare: { type: Boolean, default: false }
        }
    },
    callStats: {
        totalCalls: { type: Number, default: 0 },
        totalCallTime: { type: Number, default: 0 }, // in milliseconds
        averageCallDuration: { type: Number, default: 0 },
        lastCallDate: Date
    }
}, { timestamps: true }); // createdAt & updatedAt

const User = mongoose.model("User", userSchema);
export default User;