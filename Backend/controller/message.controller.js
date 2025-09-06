import { getReceiverSocketId, io } from "../SocketIO/server.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id; // current logged in user
    
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        members: [senderId, receiverId],
      });
    }
    
    const newMessage = new Message({
      senderId,
      receiverId,
      message,
    });
    
    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }
    
    await Promise.all([conversation.save(), newMessage.save()]); // run parallel
    
    // Populate sender and receiver info for the socket message
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'fullname email avatar')
      .populate('receiverId', 'fullname email avatar');
    
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // Send to receiver only
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendMessage", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessage = async (req, res) => {
  try {
    const { id: chatUser } = req.params;
    const senderId = req.user._id; // current logged in user
    
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, chatUser] },
    }).populate({
      path: "messages",
      populate: {
        path: "senderId receiverId",
        select: "fullname email avatar"
      }
    });
    
    if (!conversation) {
      return res.status(201).json([]);
    }
    
    const messages = conversation.messages;
    res.status(201).json(messages);
  } catch (error) {
    console.log("Error in getMessage", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
