import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const question =
    "How many vacation days do employees receive, who approves leave requests, and how much notice is required?";

const prompt = `
You are a query decomposition system.

Break the complex user question into smaller,
independent questions.

Each question should represent one separate
information need.

Do not answer the questions.

Return only the sub-questions,
one per line.

User question:
${question}
`;

const response =
    await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });

const subQuestions =
    response.text
        .split("\n")
        .map(q => q.trim())
        .filter(q => q.length > 0);

console.log("ORIGINAL QUESTION:");
console.log(question);

console.log("\nSUB-QUESTIONS:");

for (const subQuestion of subQuestions) {
    console.log("-", subQuestion);
}