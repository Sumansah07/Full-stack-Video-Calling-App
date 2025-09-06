import React from "react";
import useConversation from "../../zustand/useConversation.js";
import { useSocketContext } from "../../context/SocketContext.jsx";
import CallButtons from "../../components/VideoCall/CallButtons.jsx";
import { CiMenuFries } from "react-icons/ci";

import profile from "../../assets/user.jpg"; // getting photo from assets folder.

function Chatuser() {
  const { selectedConversation } = useConversation();
  const { onlineUsers } = useSocketContext();
  
  const getOnlineUsersStatus = (userId) => {
    // Prioritize socket data for real-time accuracy
    const isOnline = onlineUsers.includes(userId);
    return isOnline ? "Online" : "Offline";
  };
  
  const isUserOnline = onlineUsers.includes(selectedConversation._id);

  // console.log(selectedConversation.fullname);
  return (
    <div className="relative flex items-center h-[8%] justify-center gap-4 bg-slate-800 hover:bg-slate-700 duration-300 rounded-md">
      <label
        htmlFor="my-drawer-2"
        className="btn btn-ghost drawer-button lg:hidden absolute left-5"
      >
        <CiMenuFries className="text-white text-xl" />
      </label>
      <div className="flex space-x-3 items-center justify-between h-[8vh] bg-gray-800 hover:bg-gray-700 duration-300 px-4">
        <div className="flex space-x-3 items-center">
          <div className="avatar online">
            <div className="w-16 rounded-full">
              <img src={profile} />
            </div>
          </div>
          <div>
            <h1 className="text-xl">{selectedConversation.fullname}</h1>
            <span className="text-sm">
              {getOnlineUsersStatus(selectedConversation._id)}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <CallButtons 
            userId={selectedConversation._id} 
            userName={selectedConversation.fullname} 
            isOnline={isUserOnline} 
          />
        </div>
      </div>
    </div>
  );
}

export default Chatuser;
