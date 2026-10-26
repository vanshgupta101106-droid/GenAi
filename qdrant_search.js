import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const COLLECTION_NAME = "employee_documents";

const question = "How many vacation days are employees entitled to?";

try {

    // 1. Create embedding for the question
    console.log("Creating question embedding...");

    const response = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

    const queryEmbedding = response.embeddings[0].values;


    // 2. Search Qdrant
    console.log("Searching Qdrant...");

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );


    // 3. Display results
    console.log("\nSEARCH RESULTS:");

    for (const result of searchResponse.points) {

        console.log("Score:", result.score);

        console.log("Text:", result.payload.text);

        console.log("--------------------");
    }

} catch (error) {

    console.error("Search failed:");
    console.error(error);

}