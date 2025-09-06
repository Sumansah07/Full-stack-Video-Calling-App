import React, { useEffect } from "react";
import { useSocketContext } from "./SocketContext";
import useConversation from "../zustand/useConversation.js";
import { useAuth } from "./AuthProvider";
import sound from "../assets/notification.mp3";

const useGetSocketMessage = () => {
  const { socket } = useSocketContext();
  const { messages, setMessage, selectedConversation } = useConversation();
  const [authUser] = useAuth();

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (newMessage) => {
      // Handle both populated and non-populated sender/receiver IDs
      const senderId = typeof newMessage.senderId === 'object' ? newMessage.senderId._id : newMessage.senderId;
      const receiverId = typeof newMessage.receiverId === 'object' ? newMessage.receiverId._id : newMessage.receiverId;
      
      // Only add message if it's for the current conversation and not sent by current user
      if (selectedConversation && 
          (senderId === selectedConversation._id || receiverId === selectedConversation._id) &&
          senderId !== authUser.user._id) {
        
        const notification = new Audio(sound);
        notification.play();
        setMessage([...messages, newMessage]);
      }
    };

    socket.on("newMessage", handleNewMessage);
    
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, messages, setMessage, selectedConversation, authUser]);
};

export default useGetSocketMessage;
