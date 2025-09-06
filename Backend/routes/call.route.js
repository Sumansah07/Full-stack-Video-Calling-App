import express from "express";
import { 
  getCallHistory as getCallHistoryController,
  getActiveCalls,
  createCall,
  updateCall,
  getCallStats,
  updateUserStatus,
  getCallPreferences,
  updateCallPreferences,
  getOnlineUsers
} from "../controller/call.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router();

// All routes are protected
router.use(secureRoute);

// Call history and management
router.get("/history", getCallHistoryController);
router.get("/active", getActiveCalls);
router.post("/create", createCall);
router.put("/:roomId", updateCall);

// Call statistics
router.get("/stats", getCallStats);

// User status and presence
router.put("/status", updateUserStatus);
router.get("/online-users", getOnlineUsers);

// Call preferences
router.get("/preferences", getCallPreferences);
router.put("/preferences", updateCallPreferences);

export default router;
