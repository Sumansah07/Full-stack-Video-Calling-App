import React, { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";
import Cookies from "js-cookie";
import { getApiUrl } from "../utils/api";
const useGetMessage = () => {
  const [loading, setLoading] = useState(false);
  const { messages, setMessage, selectedConversation } = useConversation();

  useEffect(() => {
    const getMessages = async () => {
      setLoading(true);
      if (selectedConversation && selectedConversation._id) {
        try {
          // Get token for authentication
          let token = Cookies.get("jwt");
          if (!token) {
            token = localStorage.getItem("jwt");
          }
          
          const res = await axios.get(
            getApiUrl(`api/message/get/${selectedConversation._id}`),
            {
              withCredentials: true,
              headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
          setMessage(res.data);
          setLoading(false);
        } catch (error) {
          setLoading(false);
        }
      }
    };
    getMessages();
  }, [selectedConversation, setMessage]);
  return { loading, messages };
};

export default useGetMessage;
