import jwt from "jsonwebtoken";

export const authMiddleware = (request, response, next) => {
  try {
    const cookies = request.headers.cookie;
    const authToken = cookies.split("=")[1];
    if (!authToken) {
      return response
        .status(404)
        .send({ isSuccess: false, message: "No token found" });
    }

    jwt.verify(authToken, process.env.AUTH_KEY, (err, decoded) => {
      if (err) return response.status(403).send({ isSuccess: false, message: "No token found" });

      request.user = decoded;
      next();
    });
    
  } catch (error) {
    return response
      .status(401)
      .send({ isSuccess: false, message: error.message });
  }
};

// export const refreshToken = (request, response, next) => {
//   try {
//     const cookies = request.headers.cookie;
//     const prevToken = cookies.split("=")[1];
//     if (!prevToken) {
//       return response
//         .status(400)
//         .send({ isSuccess: false, message: "No token found" });
//     }
//     jwt.verify(String(prevToken), process.env.AUTH_KEY, (err, decoded) => {
//       if (err) {
//         console.log(err);
//         return response
//           .status(403)
//           .send({ isSuccess: false, message: "Authentication failed" });
//       }
//       response.clearCookie(`${decoded.id}`);
//       request.cookies[`${decoded.id}`] = "";

//       const token = jwt.sign(decoded, process.env.AUTH_KEY, {
//         expiresIn: "1h",
//       });

//       response.cookie(decoded.id, token, {
//         path: "/",
//         expires: new Date(Date.now() + 1000 * 60 * 60),
//         httpOnly: true,
//         sameSite: "lax",
//       });

//       request.user = decoded;
//       next();
//     });
//   } catch (error) {
//     return response
//       .status(401)
//       .send({ isSuccess: false, message: error.message });
//   }
// };
