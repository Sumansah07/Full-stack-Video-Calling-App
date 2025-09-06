import React from "react";
import Search from "./Search";
import Users from "./Users";
import Logout from "./Logout";
// import CallHistory from "../../components/VideoCall/CallHistory";
// import { FaClock } from "react-icons/fa";

function Left() {
  return (
    <div className="w-full   bg-black text-gray-300">
      <Search />
      <div
        className=" flex-1  overflow-y-auto"
        style={{ minHeight: "calc(84vh - 10vh)" }}
      >
        <Users />
      </div>
      <Logout />
    </div>
  );
}

export default Left;
