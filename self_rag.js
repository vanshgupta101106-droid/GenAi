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
    "How many vacation days do employees receive?";

const embeddingResponse =
    await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: question
    });

const queryEmbedding =
    embeddingResponse.embeddings[0].values;

const searchResponse =
    await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );

console.log("\nRETRIEVED DOCUMENTS:");

for (const result of searchResponse.points) {
    console.log("ID:", result.id);
    console.log("Score:", result.score);
    console.log("Text:", result.payload.text);
    console.log("--------------------");
}

const context =
    searchResponse.points
        .map(result => result.payload.text)
        .join("\n");

console.log("\nCONTEXT:");
console.log(context);


// ===============================
// SELF-RAG GENERATION LOOP
// ===============================

const MAX_ATTEMPTS = 2;

let currentAnswer = "";
let lastEvaluation = null;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

    console.log(`\n================ ATTEMPT ${attempt} ================`);

    // -------------------------------
    // GENERATE ANSWER
    // -------------------------------

    const prompt = `
    Answer the question using ONLY the provided context.

    Context:
    ${context}

    Question:
    ${question}

    ${attempt > 1 ? `
    The previous answer was NOT grounded in the context.

    Previous answer:
    ${currentAnswer}

    Why the previous answer failed:
    ${lastEvaluation.reason}

    Correct the previous answer using the context.
    The context is the ONLY source of truth.
    Do not repeat unsupported claims.
    ` : ""}

    Answer clearly and concisely.
    `;

    const response =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });

    currentAnswer =
        response.text.trim();

    console.log("\nGENERATED ANSWER:");
    console.log(currentAnswer);


    // -------------------------------
    // EVALUATE ANSWER
    // -------------------------------

    const evaluationPrompt = `
    You are an answer evaluator.

    Determine whether the generated answer is fully
    supported by the provided context.

    Context:
    ${context}

    Question:
    ${question}

    Generated answer:
    ${currentAnswer}

    Return ONLY valid JSON:

    {
        "grounded": true,
        "reason": "..."
    }

    Rules:

    - grounded = true if the answer is supported by the context.
    - grounded = false if the answer contains unsupported information.
    - Do not use outside knowledge.
    `;

    const evaluationResponse =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: evaluationPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });

    const evaluation =
        JSON.parse(evaluationResponse.text);

    lastEvaluation = evaluation;

    console.log("\nSELF-RAG EVALUATION:");
    console.log(evaluation);


    // -------------------------------
    // DECISION
    // -------------------------------

    if (evaluation.grounded) {

        console.log(
            "\nSELF-RAG: ANSWER ACCEPTED."
        );

        console.log(
            "\nFINAL ANSWER:"
        );

        console.log(currentAnswer);

        break;
    }


    // -------------------------------
    // NOT GROUNDED
    // -------------------------------

    console.log(
        "\nSELF-RAG: ANSWER NOT GROUNDED."
    );


    // Maximum attempts reached
    if (attempt === MAX_ATTEMPTS) {

        console.log(
            "\nSELF-RAG: MAX ATTEMPTS REACHED."
        );

        console.log(
            "\nFINAL ANSWER:"
        );

        console.log(
            "I don't know based on the provided information."
        );

        break;
    }


    console.log(
        "SELF-RAG: REGENERATING ANSWER..."
    );
}
