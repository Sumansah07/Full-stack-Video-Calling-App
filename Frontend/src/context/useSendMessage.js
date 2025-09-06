import React, { useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";
import Cookies from "js-cookie";
import { getApiUrl } from "../utils/api";

const useSendMessage = () => {
  const [loading, setLoading] = useState(false);
  const { messages, setMessage, selectedConversation } = useConversation();

  const sendMessages = async (message) => {
    setLoading(true);
    try {
      // Get token for authentication
      let token = Cookies.get("jwt");
      if (!token) {
        token = localStorage.getItem("jwt");
      }

      const res = await axios.post(
        getApiUrl(`api/message/send/${selectedConversation._id}`),
        { message },
        {
          withCredentials: true,
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      // Add the sent message to the current conversation immediately
      // This ensures the sender sees their own message right away
      setMessage([...messages, res.data]);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  return { loading, sendMessages };
};

export default useSendMessage;
