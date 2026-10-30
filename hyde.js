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

const COLLECTION_NAME = "parent_child_demo";


const question =
    "How many vacation days do employees receive?";

const prompt = `
You are helping a document retrieval system.

Generate a hypothetical document passage
that could contain the answer to the user's question.

Do not explain your reasoning.
Just generate the hypothetical passage.

User question:
${question}
`;

const response =
    await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt
    });

const hypotheticalDocument =
    response.text.trim();

console.log("USER QUESTION:");
console.log(question);

console.log("\nHYPOTHETICAL DOCUMENT:");
console.log(hypotheticalDocument);

const embeddingResponse =
    await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: hypotheticalDocument
    });

const hypotheticalEmbedding =
    embeddingResponse.embeddings[0].values;

console.log("\nHYPOTHETICAL EMBEDDING CREATED");
console.log(
    "Embedding dimensions:",
    hypotheticalEmbedding.length
);

console.log("\nSEARCHING QDRANT...");

const searchResponse =
    await qdrant.query(
        COLLECTION_NAME,
        {
            query: hypotheticalEmbedding,
            limit: 3,
            with_payload: true
        }
    );

console.log("\nHYDE SEARCH RESULTS:");

for (const result of searchResponse.points) {

    console.log("\nChild ID:", result.id);
    console.log("Score:", result.score);
    console.log("Text:", result.payload.childText);
}

const context = searchResponse.points
    .map(result => result.payload.childText)
    .join("\n");

console.log("\nREAL RETRIEVED CONTEXT:");
console.log(context);

const finalPrompt = `
Answer the user's question using only the provided context.

Context:
${context}

Question:
${question}

If the answer is not present in the context,
say "I don't know based on the provided information."

Answer clearly and concisely.
`;

console.log("\nGENERATING FINAL ANSWER...");

const finalResponse =
    await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: finalPrompt
    });

console.log("\nFINAL ANSWER:");
console.log(finalResponse.text);