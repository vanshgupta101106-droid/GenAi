import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const documents = [
    "Employees receive 20 days of paid annual leave.",
    "Employees can work remotely two days per week.",
    "The company provides health insurance to full-time employees.",
    "Employees must submit leave requests to their manager."
];

function cosineSimilarity(a, b) {

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {

        dotProduct += a[i] * b[i];

        magnitudeA += a[i] * a[i];

        magnitudeB += b[i] * b[i];
    }

    return dotProduct /
        (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}


const vectorStore = [];

// Create embeddings
for (const document of documents) {

    const response = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: document
    });

    vectorStore.push({
        text: document,
        embedding: response.embeddings[0].values
    });
}


// User query
const question = "How many vacation days do employees get?";


// Create embedding for question
const queryResponse = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: question
});

const queryEmbedding = queryResponse.embeddings[0].values;


// Compare question with every document
const results = vectorStore.map((document) => {

    const score = cosineSimilarity(
        queryEmbedding,
        document.embedding
    );

    return {
        text: document.text,
        score: score
    };
});


results.sort((a, b) => b.score - a.score);

const topResult = results[0];

console.log("TOP RESULT:");
console.log(topResult);