import React, { createContext, useContext, useState } from "react";
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  // Get user data from localStorage (not the JWT token)
  const initialUserState = localStorage.getItem("ChatApp");

  // parse the user data and storing in state.
  const [authUser, setAuthUser] = useState(
    initialUserState ? JSON.parse(initialUserState) : undefined
  );
  return (
    <AuthContext.Provider value={[authUser, setAuthUser]}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
