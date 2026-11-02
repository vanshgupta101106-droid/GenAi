
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

    const rewritePrompt = `
Rewrite the user's current question into a clear,
standalone search query using the conversation history.

Do not answer the question.
Only return the rewritten search query.

Conversation:
${conversation}

Current question:
${currentQuestion}
`;

    const rewriteResponse = await client.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: rewritePrompt
    });

    const rewrittenQuery = rewriteResponse.text.trim();

    console.log("Rewritten query:", rewrittenQuery);


    // STEP 2: CREATE EMBEDDING

    const embeddingResponse = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: rewrittenQuery
    });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;


    // STEP 3: SEARCH QDRANT

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );


    // STEP 4: FILTER RESULTS

    const threshold = 0.70;

    const relevantResults = searchResponse.points.filter(
        result => result.score >= threshold
    );

    console.log("\nRelevant documents:");

    for (const result of relevantResults) {
        console.log("Score:", result.score);
        console.log("Text:", result.payload.text);
        console.log("--------------------");
    }


    // STEP 5: CREATE CONTEXT

    const context = relevantResults
        .map(result => result.payload.text)
        .join("\n");

    console.log("\nContext:");
    console.log(context);


    // STEP 6: GENERATE FINAL ANSWER

    if (!context) {
        console.log(
            "\nFinal Answer: I don't know based on the provided information."
        );
    } else {

        const answerPrompt = `
Answer the question using only the provided context.

Context:
${context}

Question:
${currentQuestion}

If the answer is not present in the context,
say "I don't know based on the provided information."

Answer clearly and concisely.
`;

        const answerResponse = await client.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: answerPrompt
        });

        console.log("\nFinal Answer:");
        console.log(answerResponse.text);
    }

} catch (error) {
    console.error("Advanced RAG failed:");
    console.error(error);
}
