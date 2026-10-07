import "dotenv/config";
console.log(
    "GEMINI_API_KEY exists:",
    !!process.env.GEMINI_API_KEY
);
import documentsRouter from "./routes/documents.js";
import express from "express";

import cors from "cors";
import mongoose from "mongoose";
//require("dotenv").config();
import dns from "node:dns";
import chatRoutes from "./routes/chat.js";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8"
]);

const app=express();
const Port=8080;

app.use(express.json());
app.use(cors());

app.use("/api",chatRoutes);
app.use("/api/documents", documentsRouter);

app.listen(Port,()=>{
    console.log(`server running on ${Port}`);
    connectDB();
});
const connectDB = async()=>{
    try{
        console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("connected with the database ");
    }catch(err){
        console.log("failed to connect with the database",err);
    }
}

// app.post("/test",async(req,res)=>{
//     const options={
//         method:"POST",
//         header:{
//             "Content-Type":"application/json",
//             "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`

//         },
//         body: JSON.stringify({
//             model:"",
//             messages:[{
//                 role:"user",
//                 content:"hello"
//             }]
//         })
//     };
//     try{
//         const response=await fetch("https://api.openai.com/v1/chat/completions",options);
//         const data=await response.json();
//         console.log(data);
//         res.send(data);
        

//     }catch(err){
//         console.log(err);
//     }

// });

