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
    "Check whether my Node.js server and PostgreSQL database are healthy.";

let messages: any[] = [question];

while (true) {
    const response =
        await modelWithTools.invoke(messages);

    console.log("\nMODEL RESPONSE:");
    console.dir(response.tool_calls, { depth: null });

    // No tool requested → we're finished
    if (!response.tool_calls?.length) {
        console.log("\nFINAL ANSWER:");
        console.log(response.content);
        break;
    }

    // Add Gemini's response to the conversation
    messages.push(response);

    // Execute every requested tool
    for (const toolCall of response.tool_calls) {

        console.log(
            `\nExecuting tool: ${toolCall.name}`
        );

        let toolResult;

        if (toolCall.name === "get_database_status") {
            toolResult =
                await getDatabaseStatus.invoke(toolCall);
        }

        else if (toolCall.name === "get_server_status") {
            toolResult =
                await getServerStatus.invoke(toolCall);
        }

        else {
            throw new Error(
                `Unknown tool: ${toolCall.name}`
            );
        }

        console.log("Tool result:");
        console.log(toolResult);

        // Give result back to Gemini
        messages.push(toolResult);
    }
}