import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getDatabaseStatus = tool(
    async () => {
        return {
            status: "healthy",
            database: "PostgreSQL",
            connections: 12
        };
    },
    {
        name: "get_database_status",
        description:
            "Get the current status of the PostgreSQL database.",
        schema: z.object({})
    }
);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const modelWithTools = model.bindTools([
    getDatabaseStatus
]);

const response = await modelWithTools.invoke(
    "Is the PostgreSQL database healthy?"
);

console.dir(response, { depth: null });

const toolCall = response.tool_calls?.[0];

if (!toolCall) {
    throw new Error("Gemini did not request a tool.");
}

const toolResult = await getDatabaseStatus.invoke(
    toolCall
);

console.log("\nTOOL RESULT:");
console.log(toolResult);