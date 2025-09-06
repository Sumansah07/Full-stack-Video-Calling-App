import React, { useState } from "react";
import User from "./User";
import useGetAllUsers from "../../context/useGetAllUsers";
import AudioTest from "../../components/VideoCall/AudioTest";

function Users() {
  const [allUsers, loading] = useGetAllUsers();
  const [showAudioTest, setShowAudioTest] = useState(false);
  
  return (
    <div>
      <div className="flex justify-between items-center px-8 py-2 text-white font-semibold bg-slate-800 rounded-md">
        <h1>Messages</h1>
        <button
          onClick={() => setShowAudioTest(!showAudioTest)}
          className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
          title="Test Microphone"
        >
          🎤 Test
        </button>
      </div>
      
      {showAudioTest && (
        <div className="p-4">
          <AudioTest />
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
