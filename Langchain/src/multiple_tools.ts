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

const getServerStatus = tool(
    async () => {
        return {
            status: "running",
            server: "Node.js API",
            uptime: "2 hours"
        };
    },
    {
        name: "get_server_status",
        description:
            "Get the current status and uptime of the Node.js server.",
        schema: z.object({})
    }
);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const modelWithTools = model.bindTools([
    getDatabaseStatus,
    getServerStatus
]);

const question =
    "Is my PostgreSQL database healthy?";

const response =
    await modelWithTools.invoke(question);

console.log("\nTOOL CALLS:");
console.dir(response.tool_calls, { depth: null });