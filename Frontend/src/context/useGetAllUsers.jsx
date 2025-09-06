import React, { useEffect, useState } from "react";
import axios from "axios";
import { getApiUrl, getAuthToken } from "../utils/api";
import { useSocketContext } from "./SocketContext";

function useGetAllUsers() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { onlineUsers } = useSocketContext();

  useEffect(() => {
    const getUsers = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        
        const response = await axios.get(getApiUrl("api/user/allusers"), {
          withCredentials: true,
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        setAllUsers(response.data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    getUsers();
  }, [onlineUsers]); // Refetch when online users change

  return [allUsers, loading];
}

export default useGetAllUsers;
