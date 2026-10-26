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

const question = "What are the employee benefits?";

try {

    // 1. Convert question into embedding
    console.log("Creating question embedding...");

    const embeddingResponse = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;


    // 2. Search Qdrant with metadata filter
    console.log("Searching Qdrant...");

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,

            limit: 5,

            with_payload: true,

            filter: {
                must: [
                    {
                        key: "department",
                        match: {
                            value: "HR"
                        }
                    }
                ]
            }
        }
    );

    const topK = 3;
    const threshold = 0.50;

    const relevantResults = searchResponse.points
        .filter(result => result.score >= threshold)
        .slice(0, topK);


    // 3. Display results
    console.log("\nRELEVANT SEARCH RESULTS:");

    for (const result of relevantResults) {

        console.log("Score:", result.score);

        console.log(
            "Department:",
            result.payload.department
        );

        console.log(
            "Source:",
            result.payload.source
        );

        console.log(
            "Page:",
            result.payload.page
        );

        console.log(
            "Text:",
            result.payload.text
        );

        console.log("--------------------");
    }

} catch (error) {

    console.error("Search failed:");
    console.error(error);

}