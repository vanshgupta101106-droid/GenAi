import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const app = express();
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

app.use(express.json());

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Conversation history
const history = [];

app.post("/ask", async (req, res) => {
    try {
        console.log("1. Request received");

        const { question } = req.body;

        console.log("2. Question:", question);

        // Store user's message
        history.push({
            role: "user",
            content: question
        });

        // Convert our history into Gemini format
        const contents = history.map((message) => ({
            role: message.role === "assistant"
                ? "model"
                : "user",

            parts: [
                {
                    text: message.content
                }
            ]
        }));

        // Send conversation to Gemini
        const response = await client.models.generateContent({
            model: "gemini-3.7-flash",
            contents: contents,
            config: {
                systemInstruction:
                    "Answer the user's question clearly and simply."
            }
        });

        // Store Gemini's response
        history.push({
            role: "assistant",
            content: response.text
        });

        console.log("3. Gemini response received");

        res.json({
            answer: response.text
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

app.listen(process.env.PORT || 3001, () => {
    console.log(
        `Server is running on port ${process.env.PORT || 3001}`
    );
});