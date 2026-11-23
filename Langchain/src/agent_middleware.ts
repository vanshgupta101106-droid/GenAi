import {
    createAgent,
    createMiddleware
} from "langchain";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const controlMiddleware = createMiddleware({

    name: "ControlMiddleware",

    wrapModelCall: async (request, handler) => {

        console.log("\n===== BEFORE MODEL =====");

        console.log(
            "Number of messages:",
            request.messages.length
        );

        const lastMessage =
            request.messages[request.messages.length - 1];

        console.log(
            "Latest message:",
            lastMessage.content
        );

        const modifiedRequest = {
            ...request,

            systemMessage: request.systemMessage.concat(
                "Answer the user's question concisely. Avoid unnecessary detail."
            )
        };

        return handler(modifiedRequest);
    }
});

const agent = createAgent({
    model,
    tools: [],
    middleware: [
        controlMiddleware
    ]
});

const result = await agent.invoke({
    messages: [
        {
            role: "user",
            content: "What is PostgreSQL?"
        }
    ]
});

console.log("\n===== FINAL RESPONSE =====");

console.log(
    result.messages[result.messages.length - 1].content
);