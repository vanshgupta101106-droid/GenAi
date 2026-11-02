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

    // ------------------------------------------------
    // 1. CREATE QUESTION EMBEDDING
    // ------------------------------------------------

    console.log("Creating question embedding...");

    const embeddingResponse = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;


    // ------------------------------------------------
    // 2. SEARCH QDRANT
    // ------------------------------------------------

    console.log("Searching Qdrant...");

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,

            // Retrieve candidates
            limit: 5,

            // Return payload
            with_payload: true,

            // Metadata filter
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


    // ------------------------------------------------
    // 3. APPLY THRESHOLD + TOP-K
    // ------------------------------------------------

    const topK = 3;

    const threshold = 0.70;

    const relevantResults = searchResponse.points
        .filter(result => result.score >= threshold)
        .slice(0, topK);


    // ------------------------------------------------
    // 4. DISPLAY RETRIEVED DOCUMENTS
    // ------------------------------------------------

    console.log("\nRELEVANT DOCUMENTS:");

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


    // ------------------------------------------------
    // 5. CREATE CONTEXT
    // ------------------------------------------------

    const context = relevantResults
        .map(result => result.payload.text)
        .join("\n");


    console.log("\nCONTEXT:");
    console.log(context);


    // ------------------------------------------------
    // 6. CREATE RAG PROMPT
    // ------------------------------------------------

    const prompt = `
Answer the question using only the provided context.

Context:
${context}

Question:
${question}

If the answer is not present in the context,
say "I don't know based on the provided information."

Answer clearly and concisely.
`;


    // ------------------------------------------------
    // 7. GENERATE FINAL ANSWER
    // ------------------------------------------------

    console.log("\nGenerating final answer...");

    const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });


    // ------------------------------------------------
    // 8. PRINT FINAL ANSWER
    // ------------------------------------------------

    console.log("\nFINAL ANSWER:");

    console.log(response.text);


} catch (error) {

    console.error("RAG failed:");
    console.error(error);

}