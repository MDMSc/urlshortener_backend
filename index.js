import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient } from "mongodb";
import { shortUrlRouter } from "./routers/shorturls.js";
import { usersRouter } from "./routers/users.js";
import { getOneShortUrl, putCounts } from "./helpers/shorturlHelper.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URL = process.env.MONGO_URL;
export const FE_LINK = "https://urlshrinker.netlify.app";

app.use(cors({ credentials: true, origin: `${FE_LINK}`}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Database connection established");
  return client;
}

export const client = await createConnection();

app.get("/", (request, response) => {
  response.send("URL Shortner");
});

app.get("/:shortUrl", async (request, response) => {
  try {
    const { shortUrl } = request.params;
    const shortFromDB = await getOneShortUrl(shortUrl);

    if (!shortFromDB) {
      response
        .status(404)
        .send({ isSuccess: false, message: "Short URL not found" });
      return;
    }

    const count = shortFromDB.clicks + 1;

    const update = await putCounts(shortUrl, count);
    if (update.matchedCount > 0 && update.modifiedCount > 0) {
      response.redirect(shortFromDB.fullUrl);
    } else {
      response
        .status(400)
        .send({ isSuccess: false, message: "Error in redirecting" });
    }
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

app.use("/api/shrinker", shortUrlRouter);
app.use("/api/users", usersRouter);

app.listen(PORT, () => console.log("Server starting at port " + PORT));
