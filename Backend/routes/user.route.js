// @ts-nocheck
import express from "express";
import {
  allUsers,
  login,
  logout,
  signup,
  updateUserStatus,
  getOnlineUsers,
} from "../controller/user.controller.js";
import secureRoute from "../middleware/secureRoute.js";
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/allusers", secureRoute, allUsers);
router.put("/status", secureRoute, updateUserStatus);
router.get("/online", secureRoute, getOnlineUsers);

export default router;
