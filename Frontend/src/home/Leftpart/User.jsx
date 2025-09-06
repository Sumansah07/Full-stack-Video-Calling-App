import React from "react";
import useConversation from "../../zustand/useConversation.js";
import { useSocketContext } from "../../context/SocketContext.jsx";
import CallButtons from "../../components/VideoCall/CallButtons.jsx";

import profile from "../../assets/user.jpg";

function User({ user }) {
  const { selectedConversation, setSelectedConversation } = useConversation();
  const isSelected = selectedConversation?._id === user._id;
  const { socket, onlineUsers } = useSocketContext();
  
  // Prioritize socket data over API data for real-time accuracy
  const isOnline = onlineUsers.includes(user._id);
  return (
    <div
      className={`hover:bg-slate-600 duration-300 ${
        isSelected ? "bg-slate-700" : ""
      }`}
      onClick={() => setSelectedConversation(user)}
    >
      <div className="flex space-x-4 px-8 py-3 hover:bg-slate-700 duration-300 cursor-pointer">
        <div className={`avatar ${isOnline ? "online" : ""}`}>
          <div className="w-12 rounded-full">
            <img src={profile} />
          </div>
        </div>
        <div className="flex-1">
          <h1 className=" font-bold">{user.fullname}</h1>
          <span>{user.email}</span>
        </div>
        <div className="flex items-center space-x-2">
          <CallButtons 
            userId={user._id} 
            userName={user.fullname} 
            isOnline={isOnline} 
          />
        </div>
      </div>
    </div>
  );
}

export default User;
