import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const COLLECTION_NAME = "employee_documents";

const evaluationData = [
    {
        question: "How many vacation days do employees get?",
        relevantTexts: [
            "Employees receive 20 days of paid annual leave."
        ]
    },

    {
        question: "How many days can employees work remotely?",
        relevantTexts: [
            "Employees can work remotely two days per week."
        ]
    },

    {
        question: "What healthcare benefit does the company provide?",
        relevantTexts: [
            "The company provides health insurance to full-time employees."
        ]
    },

    {
        question: "Who must approve leave requests?",
        relevantTexts: [
            "Employees must submit leave requests to their manager."
        ]
    },

    {
        question: "What is the company's leave policy?",
        relevantTexts: [
            "Employees receive 20 days of paid annual leave.",
            "Employees must submit leave requests to their manager."
        ]
    }
];

let totalMRR = 0;

for (const item of evaluationData) {

    console.log("\n=================================");
    console.log("QUESTION:", item.question);

    // 1. Create embedding

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: item.question
        });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;


    // 2. Search Qdrant

    const searchResponse = await qdrant.query(
        COLLECTION_NAME,
        {
            query: queryEmbedding,
            limit: 3,
            with_payload: true
        }
    );


    // 3. Find first relevant document

    const firstRelevantIndex =
        searchResponse.points.findIndex(
            retrievedResult =>
                item.relevantTexts.some(
                    expectedText =>
                        retrievedResult.payload.text
                            .toLowerCase()
                            .includes(expectedText.toLowerCase())
                )
        );


    // 4. Calculate Reciprocal Rank

    let reciprocalRank = 0;

    if (firstRelevantIndex !== -1) {

        const rank = firstRelevantIndex + 1;

        reciprocalRank = 1 / rank;

        console.log(
            "First relevant document rank:",
            rank
        );

        console.log(
            "Reciprocal Rank:",
            reciprocalRank
        );

    } else {

        console.log(
            "No relevant document found."
        );
    }


    // 5. Add to total

    totalMRR += reciprocalRank;
}


// 6. Calculate MRR

const mrr =
    totalMRR / evaluationData.length;

console.log("\n=================================");

console.log(
    "MRR@3:",
    mrr
);

console.log(
    "MRR@3 %:",
    (mrr * 100).toFixed(2) + "%"
);