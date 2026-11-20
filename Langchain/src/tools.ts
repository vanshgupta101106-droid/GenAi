import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
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

const question =
    "Is the PostgreSQL database healthy?";

// STEP 1: Ask Gemini
const response = await modelWithTools.invoke(
    question
);

console.log("\nGEMINI TOOL CALL:");
console.log(response.tool_calls);

// STEP 2: Get the requested tool
const toolCall = response.tool_calls?.[0];

if (!toolCall) {
    throw new Error("Gemini did not request a tool.");
}

// STEP 3: Execute the tool
const toolResult =
    await getDatabaseStatus.invoke(toolCall);

console.log("\nTOOL RESULT:");
console.log(toolResult);

// STEP 4: Send the tool result back to Gemini
const finalResponse =
    await modelWithTools.invoke([
        new HumanMessage(question),
        response,
        toolResult
    ]);

console.log("\nFINAL ANSWER:");
console.log(finalResponse.content);