import "dotenv/config";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const prompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        "You are a teacher. Explain concepts in very simple language."
    ],
    [
        "human",
        "Explain {topic}."
    ]
]);

const messages = await prompt.invoke({
    topic: "RAG"
});

console.log(messages);

const response = await model.invoke(messages);

console.log("\nAI RESPONSE:");
console.log(response.content);