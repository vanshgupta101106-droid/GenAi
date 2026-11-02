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

const COLLECTION_NAME = "contextual_documents";

await qdrant.createCollection(
    COLLECTION_NAME,
    {
        vectors: {
            size: 3072,
            distance: "Cosine"
        }
    }
);

const document = `
Company Remote Work Policy

Employees can work remotely two days per week.

Remote work must be approved by the employee's manager.

Employees must remain available during normal working hours.
`;

const chunks = [
    "Employees can work remotely two days per week.",
    "Remote work must be approved by the employee's manager.",
    "Employees must remain available during normal working hours."
];

for (let i = 0; i < chunks.length; i++) {

    const chunk = chunks[i];

    const prompt = `
You are helping prepare a document chunk for a RAG system.

Given the document and the chunk below, provide a short context
that explains what the chunk is about.

Document:
${document}

Chunk:
${chunk}

Return only the contextual description.
`;

    const response =
        await client.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

    const context = response.text.trim();

    const contextualChunk =
        `${context}\n${chunk}`;

    console.log("\n==============================");

    console.log("CONTEXTUAL CHUNK:");
    console.log(contextualChunk);

    // Create embedding
    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: contextualChunk
        });

    const embedding =
        embeddingResponse.embeddings[0].values;

    await qdrant.upsert(
        COLLECTION_NAME,
        {
            wait: true,
            points: [
                {
                    id: i + 1,
                    vector: embedding,
                    payload: {
                        text: contextualChunk,
                        originalText: chunk,
                        source: "remote_work_policy.pdf",
                        section: "Remote Work Policy"
                    }
                }
            ]
        }
    );

    console.log("\nEMBEDDING CREATED");
    console.log("Dimensions:", embedding.length);
}