import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import createTokenAndSaveCookie from "../jwt/generateToken.js";
export const signup = async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "User already registered" });
    }
    // Hashing the password
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = await new User({
      fullname,
      email,
      password: hashPassword,
    });
    await newUser.save();
    if (newUser) {
      createTokenAndSaveCookie(newUser._id, res);
      res.status(201).json({
        message: "User created successfully",
        user: {
          _id: newUser._id,
          fullname: newUser.fullname,
          email: newUser.email,
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!user || !isMatch) {
      return res.status(400).json({ error: "Invalid user credential" });
    }
    createTokenAndSaveCookie(user._id, res);
    res.status(201).json({
      message: "User logged in successfully",
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const logout = async (req, res) => {
  try {
    res.clearCookie("jwt");
    res.status(201).json({ message: "User logged out successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const allUsers = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUser },
    }).select("-password");
    
    // Import users object from socket server to get real-time online status
    const { users } = await import('../SocketIO/server.js');
    
    // Add real-time online status to each user
    const usersWithOnlineStatus = filteredUsers.map(user => ({
      ...user.toObject(),
      isOnline: !!users[user._id.toString()],
      realTimeStatus: users[user._id.toString()] ? 'online' : user.status
    }));
    
    res.status(201).json(usersWithOnlineStatus);
  } catch (error) {
    console.log("Error in allUsers Controller: " + error);
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;
    
    const validStatuses = ['online', 'offline', 'away', 'busy', 'in-call', 'do-not-disturb'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status, lastSeen: new Date() },
      { new: true }
    ).select("-password");
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in updateUserStatus Controller: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOnlineUsers = async (req, res) => {
  try {
    // Import users object from socket server to get real-time online status
    const { users } = await import('../SocketIO/server.js');
    
    const onlineUserIds = Object.keys(users);
    const onlineUsers = await User.find({
      _id: { $in: onlineUserIds }
    }).select("-password");
    
    res.status(200).json(onlineUsers);
  } catch (error) {
    console.log("Error in getOnlineUsers Controller: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
};
