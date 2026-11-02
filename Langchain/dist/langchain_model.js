import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});
const response = await model.invoke("Explain RAG in one sentence.");
console.log(response.content);
