
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { tavily } from "@tavily/core";

dotenv.config();

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

const COLLECTION_NAME = "employee_documents";
const MODEL = "gemini-3.7-flash";

const question =
    "What is the company's stock option policy?";

// STEP 1: Generate embedding
const embeddingResponse =
    await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

const queryEmbedding =
    embeddingResponse.embeddings[0].values;

// STEP 2: Initial Qdrant retrieval
const searchResponse =
    await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );

console.log("\nINITIAL RETRIEVED DOCUMENTS:");

for (const result of searchResponse.points) {
    console.log("\nID:", result.id);
    console.log("Score:", result.score);
    console.log("Text:", result.payload.text);
}

const context = searchResponse.points
    .map(result => result.payload.text)
    .join("\n");

// STEP 3: Evaluate initial retrieval
const evaluationPrompt = `
You are a retrieval evaluator.

Determine whether the retrieved documents contain
information that can answer the user's question.

Question:
${question}

Retrieved documents:
${context || "No documents retrieved."}

Return ONLY valid JSON:

{
    "relevant": true
}

Use:
- true if the documents contain information that can answer the question
- false if the documents are irrelevant or insufficient
`;

const evaluationResponse =
    await client.models.generateContent({
        model: MODEL,
        contents: evaluationPrompt,
        config: {
            responseMimeType: "application/json"
        }
    });

const evaluation =
    JSON.parse(evaluationResponse.text);

console.log("\nINITIAL RETRIEVAL EVALUATION:");
console.log(evaluation);

let finalContext = context;

// STEP 4: Corrective retrieval
if (!evaluation.relevant) {

    console.log("\nRETRIEVAL IS NOT RELEVANT.");
    console.log("CORRECTING QUERY...");

    const correctionPrompt = `
You are a query correction system.

The retrieved documents were not relevant to the user's question.

Rewrite the user's question into a better search query
that can be used to retrieve the required information.

Do not answer the question.
Return only the improved search query.

Original question:
${question}
`;

    const correctionResponse =
        await client.models.generateContent({
            model: MODEL,
            contents: correctionPrompt
        });

    const correctedQuery =
        correctionResponse.text.trim();

    console.log("\nCORRECTED QUERY:");
    console.log(correctedQuery);

    // STEP 5: Generate corrected embedding
    const correctedEmbeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: correctedQuery
        });

    const correctedEmbedding =
        correctedEmbeddingResponse.embeddings[0].values;

    // STEP 6: Search Qdrant again
    console.log("\nSEARCHING QDRANT AGAIN...");

    const correctedSearchResponse =
        await qdrant.query(
            COLLECTION_NAME,
            {
                query: correctedEmbedding,
                limit: 3,
                with_payload: true
            }
        );

    console.log("\nCORRECTED SEARCH RESULTS:");

    for (const result of correctedSearchResponse.points) {
        console.log("ID:", result.id);
        console.log("Score:", result.score);
        console.log("Text:", result.payload.text);
        console.log("--------------------");
    }

    const correctedContext =
        correctedSearchResponse.points
            .map(result => result.payload.text)
            .join("\n");

    // STEP 7: Evaluate corrected retrieval
    const secondEvaluationPrompt = `
You are a retrieval evaluator.

Determine whether these retrieved documents contain
information that can answer the user's question.

Question:
${question}

Retrieved documents:
${correctedContext || "No documents retrieved."}

Return ONLY valid JSON:

{
    "relevant": true
}

Use:
- true if the documents contain enough information to answer
- false if the documents are irrelevant or insufficient
`;

    const secondEvaluationResponse =
        await client.models.generateContent({
            model: MODEL,
            contents: secondEvaluationPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });

    const secondEvaluation =
        JSON.parse(secondEvaluationResponse.text);

    console.log("\nSECOND RETRIEVAL EVALUATION:");
    console.log(secondEvaluation);

    // STEP 8: Use corrected context or Tavily fallback
    if (secondEvaluation.relevant) {

        console.log("\nCORRECTED RETRIEVAL IS RELEVANT.");

        finalContext = correctedContext;

    } else {

        console.log("\nQDRANT RETRIEVAL FAILED.");
        console.log("SEARCHING THE WEB USING TAVILY...");

        // STEP 9: External web search
        const webResponse =
            await tvly.search(correctedQuery);

        console.log("\nEXTERNAL SEARCH RESULTS:");

        for (const result of webResponse.results) {
            console.log("TITLE:", result.title);
            console.log("URL:", result.url);
            console.log("CONTENT:", result.content);
            console.log("--------------------");
        }

        const externalKnowledge =
            webResponse.results
                .map(result => `
Title: ${result.title}
URL: ${result.url}
Content: ${result.content}
`)
                .join("\n");

        finalContext = externalKnowledge;
    }
}

// STEP 10: Generate final answer
console.log("\nGENERATING FINAL ANSWER...");

const finalPrompt = `
Answer the user's question using the external search
results provided below.

Question:
${question}

External search results:
${finalContext}

Use only information supported by the search results.
If the search results do not contain enough information,
say "I don't know."

Give a clear and concise answer.
`;
const finalResponse =
    await client.models.generateContent({
        model: MODEL,
        contents: finalPrompt
    });

console.log("\nFINAL ANSWER:");
console.log(finalResponse.text);
