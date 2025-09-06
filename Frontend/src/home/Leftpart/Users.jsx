import React, { useState } from "react";
import User from "./User";
import useGetAllUsers from "../../context/useGetAllUsers";
import AudioTest from "../../components/VideoCall/AudioTest";
import MediaTest from "../../components/VideoCall/MediaTest";

function Users() {
  const [allUsers, loading] = useGetAllUsers();
  const [showMediaTest, setShowMediaTest] = useState(false);
  
  return (
    <div>
      <div className="flex justify-between items-center px-8 py-2 text-white font-semibold bg-slate-800 rounded-md">
        <h1>Messages</h1>
        <button
          onClick={() => setShowMediaTest(!showMediaTest)}
          className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
          title="Test Camera & Microphone"
        >
          📹 Test Media
        </button>
      </div>
      
      {showMediaTest && (
        <div className="p-4">
          <MediaTest />
        </div>
      )}
      
      <div
        className="py-2 flex-1 overflow-y-auto"
        style={{ maxHeight: "calc(84vh - 10vh)" }}
      >
        {allUsers.map((user, index) => (
          <User key={index} user={user} />
        ))}
      </div>
    </div>
  );
}

export default Users;
