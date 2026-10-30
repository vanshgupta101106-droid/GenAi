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

const question = `
How many vacation days do employees receive,
who approves leave requests,
and how much notice is required?
`;

const subQuestions = [
    "How many vacation days do employees receive?",
    "Who approves leave requests?",
    "How much notice is required for leave requests?"
];

const allResults = [];

for (const subQuestion of subQuestions) {

    console.log("\n==============================");
    console.log("SUB-QUESTION:");
    console.log(subQuestion);

    // Create embedding for this sub-question
    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: subQuestion
        });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;

    // Search Qdrant
    const searchResponse =
        await qdrant.query(
            COLLECTION_NAME,
            {
                query: queryEmbedding,
                limit: 2,
                with_payload: true
            }
        );
    allResults.push(...searchResponse.points);

    console.log("\nRETRIEVED CHILDREN:");

    for (const result of searchResponse.points) {

        console.log("\nChild ID:", result.id);
        console.log("Score:", result.score);
        console.log(
            "Text:",
            result.payload.childText
        );
        console.log(
            "Parent ID:",
            result.payload.parentId
        );
    }
}

const uniqueResults = new Map();

for (const result of allResults) {

    if (!uniqueResults.has(result.id)) {

        uniqueResults.set(result.id, result);

    } else {

        const existingResult =
            uniqueResults.get(result.id);

        if (result.score > existingResult.score) {

            uniqueResults.set(
                result.id,
                result
            );
        }
    }
}

console.log("\n==============================");
console.log("UNIQUE RESULTS:");

for (const result of uniqueResults.values()) {

    console.log("\nChild ID:", result.id);
    console.log("Best Score:", result.score);
    console.log(
        "Text:",
        result.payload.childText
    );
    console.log(
        "Parent ID:",
        result.payload.parentId
    );
}

const parentIds = new Set();

for (const result of uniqueResults.values()) {
    parentIds.add(result.payload.parentId);
}

console.log("\nPARENT IDS:");

for (const parentId of parentIds) {
    console.log(parentId);
}

const retrievedParents = [];

for (const parentId of parentIds) {

    const parent = parents.find(
        parent => parent.id === parentId
    );

    if (parent) {
        retrievedParents.push(parent);
    }
}

console.log("\nRETRIEVED PARENTS:");

for (const parent of retrievedParents) {

    console.log("\nParent ID:", parent.id);
    console.log("Parent Text:");
    console.log(parent.text);
}

const context = retrievedParents
    .map(parent => parent.text)
    .join("\n");

console.log("\n==============================");
console.log("FINAL CONTEXT:");
console.log(context);

const prompt = `
Answer the original question using only the provided context.

Context:
${context}

Question:
${question}

If the answer is not present in the context,
say "I don't know based on the provided information."

Answer clearly and concisely.
`;

console.log("\nGENERATING FINAL ANSWER...");

const finalResponse =
    await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });

console.log("\nFINAL ANSWER:");
console.log(finalResponse.text);