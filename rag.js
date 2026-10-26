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


// Create vector store
const vectorStore = [];

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


// User question
const question = "How many vacation days do employees get?";


// Embed question
const queryResponse = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: question
});

const queryEmbedding = queryResponse.embeddings[0].values;


// Semantic search
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


// Sort by similarity
results.sort((a, b) => b.score - a.score);


// Get Top-K relevant results
const topK = 3;
const threshold = 0.70;

const relevantResults = results
    .filter(result => result.score >= threshold)
    .slice(0, topK);

console.log("RELEVANT RESULTS:");

relevantResults.forEach((result, index) => {
    console.log(
        `${index + 1}.`,
        result.text,
        result.score
    );
});


// Check if anything relevant was found
if (relevantResults.length === 0) {
    console.log("No relevant information found.");
    process.exit();
}


// Combine retrieved chunks
const context = relevantResults
    .map(result => result.text)
    .join("\n");


// Create RAG prompt
const prompt = `
Context:
${context}

Question:
${question}

Answer the question using only the context above.
`;


// Generate final answer
const response = await client.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt
});


console.log("\nFINAL ANSWER:");
console.log(response.text);