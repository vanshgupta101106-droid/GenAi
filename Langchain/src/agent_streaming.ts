import {
    createAgent
} from "langchain";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    temperature: 0
});


const agent = createAgent({
    model,
    tools: []
});


const stream = await agent.stream(
    {
        messages: [
            {
                role: "user",
                content: "Explain PostgreSQL in simple terms."
            }
        ]
    },
    {
        streamMode: "messages"
    }
);


for await (const [messageChunk, metadata] of stream) {

    const content = messageChunk.content;

    if (typeof content === "string") {

        process.stdout.write(content);

    } else if (Array.isArray(content)) {

        for (const block of content) {

            if (
                "text" in block &&
                typeof block.text === "string"
            ) {
                process.stdout.write(block.text);
            }
        }
    }
}