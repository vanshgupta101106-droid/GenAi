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

const question = "What department does EMP-48291 belong to?";

try {

    console.log("Creating question embedding...");

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: question
        });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;

    console.log("Embedding created!");

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 5,
            with_payload: true
        }
    );

    console.log("\nVECTOR SEARCH RESULTS:");

    for (const result of searchResponse.points) {

        console.log("\nID:", result.id);
        console.log("Score:", result.score);
        console.log("Text:", result.payload.text);
    }

    const keyword = "EMP-48291";

    const documents = [
        "Employees receive 20 days of paid annual leave.",
        "Employees can work remotely two days per week.",
        "The company provides health insurance to full-time employees.",
        "The finance department prepares the company's annual budget.",
        "Employee ID EMP-48291 belongs to the Finance department."
    ];

    console.log("\nKEYWORD SEARCH:");

    for (const text of documents) {

        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            console.log("MATCH:", text);
        }
    }

} catch (error) {

    console.error("Search failed:");
    console.error(error);

}