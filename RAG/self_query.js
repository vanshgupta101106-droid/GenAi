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


const question =
    "How many vacation days do HR employees receive in 2026?";

const prompt = `
You are a query understanding system.

Convert the user's question into:
1. A semantic search query
2. Metadata filters

Available metadata fields:
- department
- source
- page
- year

Return ONLY valid JSON in this format:

{
    "query": "semantic search query",
    "filters": {
        "department": "value",
        "year": 2026
    }
}

If a metadata field is not mentioned or cannot be inferred,
do not include it.

User question:
${question}
`;

const response =
    await client.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

const result =
    JSON.parse(response.text);

console.log("ORIGINAL QUESTION:");
console.log(question);

console.log("\nSELF-QUERY RESULT:");
console.log(result);

console.log("\nSEMANTIC QUERY:");
console.log(result.query);

console.log("\nMETADATA FILTERS:");
console.log(result.filters);


const embeddingResponse =
    await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: result.query
    });

const queryEmbedding =
    embeddingResponse.embeddings[0].values;

const filter = {
    must: []
};

if (result.filters.department) {
    filter.must.push({
        key: "department",
        match: {
            value: result.filters.department
        }
    });
}

if (result.filters.year) {
    filter.must.push({
        key: "year",
        match: {
            value: result.filters.year
        }
    });
}

const searchResponse =
    await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 5,
            with_payload: true,
            filter: filter
        }
    );

console.log("\nSEARCH RESULTS:");

for (const item of searchResponse.points) {
    console.log("\nID:", item.id);
    console.log("Score:", item.score);
    console.log("Payload:", item.payload);
}

const context = searchResponse.points
    .map(item => item.payload.text)
    .join("\n");

console.log("\nFINAL CONTEXT:");
console.log(context);

const finalPrompt = `
Context:
${context}

Question:
${question}

Answer the question using the context.
`;

console.log("\nGENERATING FINAL ANSWER...");

const finalResponse =
    await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: finalPrompt
    });

console.log("\nFINAL ANSWER:");
console.log(finalResponse.text);

if (!secondEvaluation.relevant) {

    console.log("\nCRAG: RETRIEVAL STILL NOT RELEVANT.");
    console.log("CRAG: Using fallback knowledge source...");

    const externalKnowledge = `
    Employee Stock Option Plans (ESOPs) are programs that may
    provide eligible employees with the right to acquire company
    shares under specified terms. An ESOP policy may define
    eligibility, the number of options granted, vesting schedules,
    exercise rules, and expiration conditions.
    `;

    const fallbackPrompt = `
    Answer the user's question using only the fallback knowledge
    provided below.

    Fallback knowledge:
    ${externalKnowledge}

    Question:
    ${question}

    If the fallback knowledge does not contain the answer,
    say "I don't know."

    Answer clearly and concisely.
    `;

    const fallbackResponse =
        await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: fallbackPrompt
        });

    console.log("\nFINAL ANSWER:");
    console.log(fallbackResponse.text);
}