
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

const conversation = `
User: How many vacation days do employees get?
Assistant: Employees receive 20 days of paid annual leave.
`;

const currentQuestion = "What about remote work?";

try {

    // STEP 1: REWRITE QUERY

    const prompt = `
Rewrite the user's current question into a clear,
standalone search query using the conversation history.

Do not answer the question.
Only return the rewritten search query.

Conversation:
${conversation}

Current question:
${currentQuestion}
`;

    console.log("Rewriting query...");

    const response = await client.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt
    });

    const rewrittenQuery = response.text.trim();

    console.log("\nOriginal question:");
    console.log(currentQuestion);

    console.log("\nRewritten query:");
    console.log(rewrittenQuery);


    // STEP 2: CREATE EMBEDDING

    const embeddingResponse = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: rewrittenQuery
    });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;

    console.log("\nEmbedding dimensions:", queryEmbedding.length);


    // STEP 3: SEARCH QDRANT

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );


    // STEP 4: DISPLAY RESULTS

    console.log("\nRetrieved documents:");

    for (const result of searchResponse.points) {
        console.log("Score:", result.score);
        console.log("Text:", result.payload.text);
        console.log("Source:", result.payload.source);
        console.log("--------------------");
    }

} catch (error) {
    console.error("Query rewriting failed:");
    console.error(error);
}
