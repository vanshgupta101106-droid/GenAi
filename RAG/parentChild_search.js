import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION_NAME = "parent_child_demo";

const parents = [
    {
        id: "leave-policy-1",
        text: `
Company Leave Policy

Employees receive 20 days of paid annual leave.

Employees must submit leave requests to their manager.

Leave requests should normally be submitted at least 5 days
before the planned leave.
`
    }
];

const question =
    "How many vacation days do employees receive?";

console.log("QUESTION:");
console.log(question);

// Create query embedding
const embeddingResponse =
    await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

const queryEmbedding =
    embeddingResponse.embeddings[0].values;

// Search child vectors
const searchResponse =
    await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 1,
            with_payload: true
        }
    );

const child = searchResponse.points[0];

console.log("\nRETRIEVED CHILD:");
console.log("Child ID:", child.id);
console.log("Score:", child.score);
console.log("Child Text:", child.payload.childText);
console.log("Parent ID:", child.payload.parentId);

const parent = parents.find(
    parent => parent.id === child.payload.parentId
);

console.log("\nRETRIEVED PARENT:");
console.log(parent.text);

const prompt = `
Answer the question using only the provided context.

Context:
${parent.text}

Question:
${question}

If the answer is not present in the context,
say "I don't know based on the provided information."

Answer clearly and concisely.
`;

console.log("\nGENERATING ANSWER...");

const finalResponse =
    await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });

console.log("\nFINAL ANSWER:");
console.log(finalResponse.text);