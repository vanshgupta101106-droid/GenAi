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
await qdrant.createCollection(
    COLLECTION_NAME,
    {
        vectors: {
            size: 3072,
            distance: "Cosine"
        }
    }
);

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

const children = [
    {
        id: 101,
        parentId: "leave-policy-1",
        text: "Employees receive 20 days of paid annual leave."
    },
    {
        id: 102,
        parentId: "leave-policy-1",
        text: "Employees must submit leave requests to their manager."
    },
    {
        id: 103,
        parentId: "leave-policy-1",
        text: "Leave requests should normally be submitted at least 5 days before the planned leave."
    }
];

console.log("PARENTS:");
console.log(parents);

console.log("\nCHILDREN:");
console.log(children);

for (const child of children) {

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: child.text
        });

    const embedding =
        embeddingResponse.embeddings[0].values;

    await qdrant.upsert(
        COLLECTION_NAME,
        {
            wait: true,
            points: [
                {
                    id: child.id,
                    vector: embedding,
                    payload: {
                        childText: child.text,
                        parentId: child.parentId
                    }
                }
            ]
        }
    );

console.log("STORED IN QDRANT");

    console.log("\n==============================");

    console.log("CHILD ID:", child.id);
    console.log("PARENT ID:", child.parentId);
    console.log("TEXT:", child.text);
    console.log("EMBEDDING DIMENSIONS:", embedding.length);
}