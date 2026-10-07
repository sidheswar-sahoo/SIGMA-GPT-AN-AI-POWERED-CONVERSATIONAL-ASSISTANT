import express from "express";
import Thread from "../models/Threads.js";
import getGeminiAPIResponse from "../utils/openai.js";
import generateRAGResponse from "../services/rag.js";

const router = express.Router();

// Test route
router.post("/test", async (req, res) => {
    try {
        const thread = new Thread({
            threadId: "xyz",
            title: "testing new Thread"
        });

        const response = await thread.save();

        res.send(response);

    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "failed to save in DB"
        });
    }
});


// Get all threads
router.get("/thread", async (req, res) => {
    try {
        const threads = await Thread.find({}).sort({
            updatedAt: -1
        });

        res.json(threads);

    } catch (err) {
        console.log(err);

        res.status(500).json({
            error: "failed to fetch the threads"
        });
    }
});


// Get a particular thread
router.get("/thread/:threadId", async (req, res) => {

    const { threadId } = req.params;

    try {

        const thread = await Thread.findOne({ threadId });

        if (!thread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        res.json(thread.messages);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "failed to fetch chat"
        });
    }
});


// Delete a thread
router.delete("/thread/:threadId", async (req, res) => {

    const { threadId } = req.params;

    try {

        const deleteThread =
            await Thread.findOneAndDelete({ threadId });

        if (!deleteThread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        res.status(200).json({
            success: "thread deleted successfully"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "failed to delete Thread"
        });
    }
});


// Chat + RAG
router.post("/chat", async (req, res) => {

    const { threadId, message } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({
            error: "missing required fields"
        });
    }

    try {

        // Find existing thread
        let thread = await Thread.findOne({ threadId });

        // Create new thread if it doesn't exist
        if (!thread) {

            thread = new Thread({
                threadId,
                title: message,
                messages: [
                    {
                        role: "user",
                        content: message
                    }
                ]
            });

        } else {

            thread.messages.push({
                role: "user",
                content: message
            });

        }


        // ------------------------------------------------
        // RAG
        // ------------------------------------------------

        let assistantReply;
        let sources = [];

        try {

            const ragResult =
                await generateRAGResponse(message);

            assistantReply = ragResult.answer;
            sources = ragResult.sources;

        } catch (ragError) {

            console.log(
                "RAG failed, using normal Gemini response:",
                ragError
            );

            // Fallback to normal Gemini
            assistantReply =
                await getGeminiAPIResponse(message);
        }


        // Save assistant response
        thread.messages.push({
            role: "assistant",
            content: assistantReply
        });

        thread.updatedAt = new Date();

        await thread.save();


        // Send response
        res.json({
            reply: assistantReply,
            sources: sources
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "message went wrong"
        });
    }
});


export default router;