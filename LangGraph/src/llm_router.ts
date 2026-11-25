import { z } from "zod";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ROUTE SCHEMA
const RouteSchema = z.object({
    route: z.enum(["technical", "general"])
});

// MODEL
const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0
});

// CLASSIFIER
const classifier = model.withStructuredOutput(RouteSchema);

// USER QUESTION
const question =
    "Why is my Node.js API getting ECONNREFUSED from PostgreSQL?";

// CLASSIFY QUESTION
const result = await classifier.invoke([
    {
        role: "system",

        content:
            "Classify the user's question. Return technical for programming, software, database, server, API, debugging, or infrastructure questions. Return general for other questions."
    },
    {
        role: "user",

        content: question
    }
]);

// FINAL OUTPUT
console.log("\n===== ROUTER RESULT =====");

console.log(result);

console.log("Selected route:", result.route);