import express from "express";
import { ObjectId } from "mongodb";
import shortid from "shortid";
import * as validUrl from "valid-url";
import {
  getAllUrls,
  getOneFullUrl,
  getUrls,
  postUrl,
} from "../helpers/shorturlHelper.js";
import { getOneUser } from "../helpers/usersHelper.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/shortUrls", authMiddleware, async (request, response) => {
  try {
    const user = await getOneUser({ email: request.user.email });
    if (!user) {
      response
        .status(401)
        .send({ isSuccess: false, message: "Unauthorized" });
      return;
    };

    const { fullUrl } = request.body;
    if (!fullUrl) {
      response
        .status(400)
        .send({ isSuccess: false, message: "Full URL required" });
      return;
    } else if(!validUrl.isUri(fullUrl)) {
      response
        .status(400)
        .send({ isSuccess: false, message: "Not a valid url" });
      return;
    }

    const checkedFull = await getOneFullUrl(user, fullUrl);
    if (checkedFull) {
      response
        .status(400)
        .send({
          isSuccess: false,
          message: "Short URL has already been created for this URL",
        });
      return;
    }

    const shortUrl = shortid.generate();
    const clicks = 0;
    const currentTimestamp = new Date(new Date().getTime() + (330 * 60000));

    const result = await postUrl({
      fullUrl: fullUrl,
      shortUrl: shortUrl,
      clicks: clicks,
      createdAt: currentTimestamp,
      user: user._id,
      username: `${user.lastName}, ${user.firstName}`,
    });

    if (result.acknowledged && result.insertedId !== "") {
      response
        .status(200)
        .send({ isSuccess: true, message: "URL shrinked successfully" });
    } else {
      response
        .status(400)
        .send({ isSuccess: false, message: "Failed to shrink URL" });
    }
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

// router.get("/all-shortUrls", async (request, response) => {
//   try {
//     let queries = {};
//     if(request.query.sortClicks){
//       if(request.query.sortClicks === "asc"){
//         queries.clicks = 1;
//       } else if(request.query.sortClicks === "desc"){
//         queries.clicks = -1;
//       }
//     } 
    
//     if(request.query.sortDate){
//       if(request.query.sortDate === "asc"){
//         queries.createdAt = 1;
//       } else if(request.query.sortDate === "desc"){
//         queries.createdAt = -1;
//       }
//     } 
//     const result = await getAllUrls(queries);
    
//     result.length
//       ? response.status(200).send(result)
//       : response
//           .status(404)
//           .send({ isSuccess: false, message: "No data found" });
//   } catch (error) {
//     response.status(400).send({ isSuccess: false, message: error.message });
//   }
// });

router.get("/shortUrls", authMiddleware, async (request, response) => {
  try {
    const user = await getOneUser({ _id: ObjectId(request.user.id), email: request.user.email });
    if (!user) {
      response
        .status(401)
        .send({ isSuccess: false, message: "Unauthorized" });
      return;
    };

    let queries = {};
    if(request.query.sortClicks){
      if(request.query.sortClicks === "asc"){
        queries.clicks = 1;
      } else if(request.query.sortClicks === "desc"){
        queries.clicks = -1;
      }
    } 
    
    if(request.query.sortDate){
      if(request.query.sortDate === "asc"){
        queries.createdAt = 1;
      } else if(request.query.sortDate === "desc"){
        queries.createdAt = -1;
      }
    } 

    let result;
    if(user.isAdmin){
      result = await getAllUrls(queries);
    } else {
      result = await getUrls({ user: user._id }, queries);
    }

    result.length ? 
      response.status(200).send(result)
      : response
          .status(404)
          .send({ isSuccess: false, message: "No data found" });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

export const shortUrlRouter = router;
