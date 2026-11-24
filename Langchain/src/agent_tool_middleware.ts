import "dotenv/config";

import {
    createAgent,
    createMiddleware,
    tool
} from "langchain";

import {
    ToolMessage
} from "@langchain/core/messages";

import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// MODEL
const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

// TOOL 1
const getDatabaseStatus = tool(
    async () => {
        console.log("\n>>> DATABASE TOOL EXECUTED");

        throw new Error(
            "PostgreSQL connection failed."
        );
    },
    {
        name: "get_database_status",
        description:
            "Check the current PostgreSQL database status.",
        schema: z.object({})
    }
);

// TOOL 2
const deleteDatabase = tool(
    async () => {
        console.log("\n>>> DELETE DATABASE TOOL EXECUTED");

        return "Database deletion completed.";
    },
    {
        name: "delete_database",
        description:
            "Delete the PostgreSQL database.",
        schema: z.object({})
    }
);

// TOOL MIDDLEWARE
const toolMiddleware = createMiddleware({
    name: "ToolLoggingMiddleware",

    wrapToolCall: async (request, handler) => {

        console.log("\n===== TOOL CALL =====");

        console.log(
            "Tool:",
            request.tool?.name
        );

        console.log(
            "Arguments:",
            request.toolCall.args
        );

        // Authorization
        if (
            request.tool?.name !== "get_database_status" &&
            request.tool?.name !== "delete_database"
        ) {

            throw new Error(
                `Tool "${request.tool?.name}" is not authorized.`
            );
        }

        console.log("Tool authorized.");

        try {

            const result = await handler(request);

            console.log(
                "Tool execution completed."
            );

            return result;

        } catch (error) {

            console.log("\n===== TOOL ERROR =====");

            console.log(error);

            const toolCallId = request.toolCall.id;

            if (!toolCallId) {
                throw new Error(
                    "Tool call ID is missing."
                );
            }

            return new ToolMessage({

                content: `Tool failed: ${
                    error instanceof Error
                        ? error.message
                        : "Unknown tool error"
                }`,

                tool_call_id: toolCallId,

                status: "error"
            });
        }
    }
});

// AGENT
const agent = createAgent({
    model,
    tools: [
        getDatabaseStatus,
        deleteDatabase
    ],
    middleware: [toolMiddleware]
});

// RUN AGENT
try {

    const result = await agent.invoke({
        messages: [
            {
                role: "user",
                content:
                    "Use the delete_database tool to delete the PostgreSQL database."
            }
        ]
    });

    // FINAL RESPONSE
    console.log("\n===== FINAL RESPONSE =====");

    console.log(
        result.messages[result.messages.length - 1].content
    );

} catch (error) {

    console.log("\n===== AGENT ERROR =====");

    console.log(
        error instanceof Error ? error.message : error
    );
}