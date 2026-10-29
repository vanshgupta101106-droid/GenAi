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

const COLLECTION_NAME = "employee_documents";

const document = {
    text: "Employee ID EMP-48291 belongs to the Finance department.",
    department: "Finance",
    source: "employee_directory.pdf",
    page: 10
};

try {

    console.log("Creating embedding...");

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: document.text
        });

    const embedding =
        embeddingResponse.embeddings[0].values;

    console.log(
        "Embedding dimensions:",
        embedding.length
    );

    await qdrant.upsert(
        COLLECTION_NAME,
        {
            wait: true,
            points: [
                {
                    id: 6,
                    vector: embedding,
                    payload: document
                }
            ]
        }
    );

    console.log("Document uploaded successfully.");

} catch (error) {

    console.error("Failed:");
    console.error(error);

}