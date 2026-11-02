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

const question =
    "How often are employees permitted to work from home?";

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

console.log("\nQUERY EMBEDDING CREATED");
console.log("Dimensions:", queryEmbedding.length);

// Search Qdrant
const searchResponse =
    await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );

console.log("\nSEARCH RESULTS:");

for (const result of searchResponse.points) {

    console.log("\nID:", result.id);
    console.log("Score:", result.score);
    console.log("Contextual Text:", result.payload.text);
    console.log("Original Text:", result.payload.originalText);
}