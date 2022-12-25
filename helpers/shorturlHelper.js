import {client} from "../index.js";

export async function postUrl(data){
    return await client
      .db("urlShortner")
      .collection("urls")
      .insertOne(data);
};

export async function getAllUrls(queries){
    return await client
      .db("urlShortner")
      .collection("urls")
      .find({}).sort(queries).toArray();
};

export async function getUrls(data, queries){
  return await client
    .db("urlShortner")
    .collection("urls")
    .find(data).sort(queries).toArray();
};

export async function getOneFullUrl(user, fullUrl){
    return await client
      .db("urlShortner")
      .collection("urls")
      .findOne({ fullUrl: fullUrl, user: user._id });
};

export async function getOneShortUrl(shortUrl){
    return await client
      .db("urlShortner")
      .collection("urls")
      .findOne({ shortUrl: shortUrl });
};

export async function putCounts(shortUrl, count){
    return await client
      .db("urlShortner")
      .collection("urls")
      .updateOne({ shortUrl: shortUrl }, {$set: {clicks: count}});
};
