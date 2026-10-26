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

    // ==========================================
    // STEP 1: EMBEDDING
    // ==========================================

    console.log("Creating question embedding...");

    const embeddingResponse = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;


    // ==========================================
    // STEP 2: RETRIEVAL FROM QDRANT
    // ==========================================

    console.log("Searching Qdrant...");

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );


    // ==========================================
    // STEP 3: GET RETRIEVED DOCUMENTS
    // ==========================================

    console.log("\nRETRIEVED DOCUMENTS:");

    for (const result of searchResponse.points) {

        console.log("Score:", result.score);
        console.log("Text:", result.payload.text);
        console.log("--------------------");

    }


    // ==========================================
    // STEP 4: CREATE CONTEXT
    // ==========================================

    const context = searchResponse.points
        .map(result => result.payload.text)
        .join("\n");


    console.log("\nCONTEXT:");
    console.log(context);


    // ==========================================
    // STEP 5: CREATE PROMPT
    // ==========================================

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


    // ==========================================
    // STEP 6: SEND CONTEXT TO GEMINI
    // ==========================================

    console.log("\nGenerating final answer...");

    const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });


    // ==========================================
    // STEP 7: FINAL ANSWER
    // ==========================================

    console.log("\nFINAL ANSWER:");
    console.log(response.text);


} catch (error) {

    console.error("RAG failed:");
    console.error(error);

}