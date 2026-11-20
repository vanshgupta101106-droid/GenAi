import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getServerStatus = tool(
    async () => ({
        status: "running",
        server: "Node.js API",
        uptime: "2 hours"
    }),
    {
        name: "get_server_status",
        description: "Get the current status of the Node.js server.",
        schema: z.object({})
    }
);

const agent = createAgent({
    model: new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash-lite",
        temperature: 0
    }),
    tools: [getServerStatus]
});

const result = await agent.invoke({
    messages: [
        {
            role: "user",
            content: "Is my Node.js server running?"
        }
    ]
});

console.log("NUMBER OF MESSAGES:", result.messages.length);

for (const message of result.messages) {
    console.log("\nMESSAGE TYPE:", message.constructor.name);
    console.log("CONTENT:", message.content);

    if ("tool_calls" in message) {
        console.log("TOOL CALLS:", message.tool_calls);
    }
}