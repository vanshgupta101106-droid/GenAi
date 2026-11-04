import "dotenv/config";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const ragSchema = z.object({
    topic: z.string(),
    difficulty: z.string(),
    summary: z.string()
});

const structuredModel = model.withStructuredOutput(ragSchema);

const response = await structuredModel.invoke(
    "Explain RAG."
);

console.log(response);