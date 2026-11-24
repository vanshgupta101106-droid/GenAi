import {
    createAgent,
    createMiddleware,
    tool
} from "langchain";

import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// MODEL
const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0
});

// TOOL
const getDatabaseStatus = tool(
    async () => {
        console.log("\n>>> DATABASE TOOL EXECUTED");

        return "PostgreSQL is running normally.";
    },
    {
        name: "get_database_status",
        description: "Check the current PostgreSQL database status.",
        schema: z.object({})
    }
);

// TOOL MIDDLEWARE
const toolMiddleware = createMiddleware({
    name: "ToolLoggingMiddleware",

    wrapToolCall: async (request, handler) => {

        console.log("\n===== TOOL CALL =====");

        console.log("Tool:", request.toolCall.name);

        console.log("Arguments:", request.toolCall.args);

        const result = await handler(request);

        console.log("Tool execution completed.");

        return result;
    }
});

// AGENT
const agent = createAgent({
    model,
    tools: [getDatabaseStatus],
    middleware: [toolMiddleware]
});

// RUN AGENT
const result = await agent.invoke({
    messages: [
        {
            role: "user",
            content: "Check the PostgreSQL database status."
        }
    ]
});

// FINAL RESPONSE
console.log("\n===== FINAL RESPONSE =====");

console.log(
    result.messages[result.messages.length - 1].content
);