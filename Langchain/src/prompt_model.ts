import "dotenv/config";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const prompt = ChatPromptTemplate.fromTemplate(
    "Explain {topic} in simple language."
);

const messages = await prompt.invoke({
    topic: "RAG"
});

const response = await model.invoke(messages);

console.log(response.content);