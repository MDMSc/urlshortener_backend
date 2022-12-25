import {client} from "../index.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

export async function getOneUser(data){
    return await client.db("urlShortner").collection("users").findOne(data);
};

export async function getHashedPassword(password){
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
};

export async function postUser(data){
    return await client.db("urlShortner").collection("users").insertOne(data);
};

export async function putActivateUser(id){
    const userID = ObjectId(id);
    return await client.db("urlShortner").collection("users").updateOne({_id: userID}, {$set: {activated: true}});
};

export async function putUpdateUser(email, data){
    return await client.db("urlShortner").collection("users").updateOne({email: email}, {$set: data});
}
