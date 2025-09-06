import jwt from "jsonwebtoken";

const createTokenAndSaveCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_TOKEN, {
    expiresIn: "10d",
  });
  res.cookie("jwt", token, {
    httpOnly: true, // xss
    secure: process.env.NODE_ENV === "production", // Only secure in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Allow cross-site in production
    domain: process.env.NODE_ENV === "production" ? undefined : undefined, // Let browser handle domain
  });
  return token; // Return token so it can be included in response
};
export default createTokenAndSaveCookie;
