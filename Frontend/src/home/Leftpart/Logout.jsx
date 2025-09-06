import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { BiLogOutCircle } from "react-icons/bi";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { getApiUrl } from "../../utils/api";
function Logout() {
  const [loading, setLoading] = useState(false);
  const handleLogout = async () => {
    setLoading(true);
    try {
      // Get token for authentication
      let token = Cookies.get("jwt");
      if (!token) {
        token = localStorage.getItem("jwt");
      }
      
      const res = await axios.post(getApiUrl("api/user/logout"), {}, {
        withCredentials: true,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      localStorage.removeItem("ChatApp");
      localStorage.removeItem("jwt");
      Cookies.remove("jwt");
      setLoading(false);
      toast.success("Logged out successfully");
      window.location.reload();
    } catch (error) {
      console.log("Error in Logout", error);
      toast.error("Error in logging out");
    }
  };
  return (
    <>
      <hr />
      <div className=" h-[10vh] bg-transparent">
        <div>
          <BiLogOutCircle
            className="text-5xl text-white hover:bg-slate-700 duration-300 cursor-pointer rounded-full p-2 ml-2 mt-1"
            onClick={handleLogout}
          />
        </div>
      </div>
    </>
  );
}

export default Logout;
