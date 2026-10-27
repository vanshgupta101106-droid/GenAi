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

let totalPrecision = 0;

for (const item of evaluationData) {

    console.log("\n=================================");
    console.log("QUESTION:", item.question);

    // 1. Create query embedding

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


    // 3. Count relevant retrieved documents

    let relevantRetrieved = 0;

    for (const retrievedResult of searchResponse.points) {

        const found = item.relevantTexts.some(
            expectedText =>
                retrievedResult.payload.text
                    .toLowerCase()
                    .includes(expectedText.toLowerCase())
        );

        if (found) {
            relevantRetrieved++;

            console.log(
                "Relevant:",
                retrievedResult.payload.text
            );
        } else {
            console.log(
                "Irrelevant:",
                retrievedResult.payload.text
            );
        }
    }


    // 4. Calculate Precision@3

    const precision =
        relevantRetrieved / searchResponse.points.length;


    console.log(
        "Total documents retrieved:",
        searchResponse.points.length
    );

    console.log(
        "Relevant documents retrieved:",
        relevantRetrieved
    );

    console.log(
        "Precision@3:",
        precision
    );

    console.log(
        "Precision@3 %:",
        (precision * 100).toFixed(2) + "%"
    );


    // 5. Add to total

    totalPrecision += precision;
}


// 6. Average Precision

const averagePrecision =
    totalPrecision / evaluationData.length;

console.log("\n=================================");

console.log(
    "AVERAGE PRECISION@3:",
    averagePrecision
);

console.log(
    "AVERAGE PRECISION@3 %:",
    (averagePrecision * 100).toFixed(2) + "%"
);