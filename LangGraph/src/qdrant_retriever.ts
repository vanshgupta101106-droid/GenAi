import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";


// ENVIRONMENT VALIDATION
if (
    !process.env.GEMINI_API_KEY ||
    !process.env.QDRANT_URL ||
    !process.env.QDRANT_API_KEY
) {
    throw new Error("Missing required environment variables.");
}


// QDRANT CLIENT
const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});


// COLLECTION INFORMATION
const collection = await client.getCollection(
    "developer_edit_docs"
);

console.log("\n===== COLLECTION INFO =====");

console.log("Status:", collection.status);

console.log("Total points:", collection.points_count);

console.log("Vector configuration:", collection.config.params.vectors);


// EMBEDDINGS
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY
});


// VECTOR STORE
const vectorStore =
    await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY,
            collectionName: "developer_edit_docs"
        }
    );


// RETRIEVER
export const retriever = vectorStore.asRetriever({
    k: 2
});