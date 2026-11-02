import { ChatPromptTemplate } from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromTemplate(
    "Explain {topic} in simple language."
);

const messages = await prompt.invoke({
    topic: "RAG"
});

console.log(messages);