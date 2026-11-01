
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

try {
    let totalRecall = 0;

    for (const item of evaluationData) {
        console.log("\n=================================");
        console.log(`Evaluating question: ${item.question}`);

        // 1. Create question embedding
        const embeddingResponse = await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: item.question
        });

        const queryEmbedding =
            embeddingResponse.embeddings[0].values;

        // 2. Retrieve the top 3 documents from Qdrant
        const searchResponse = await qdrant.query(
            COLLECTION_NAME,
            {
                query: queryEmbedding,
                limit: 3,
                with_payload: true
            }
        );

        // 3. Evaluate which relevant documents were retrieved
        let relevantRetrieved = 0;

        for (const relevantText of item.relevantTexts) {
            const found = searchResponse.points.some(
                retrievedResult =>
                    retrievedResult.payload?.text
                        ?.toLowerCase()
                        .includes(relevantText.toLowerCase())
            );

            if (found) {
                console.log(`Found relevant text: "${relevantText}"`);
                relevantRetrieved++;
            } else {
                console.log(`Missing relevant text: "${relevantText}"`);
            }
        }

        // 4. Calculate Recall@3
        const recall =
            relevantRetrieved / item.relevantTexts.length;

        console.log(
            "Relevant documents:",
            item.relevantTexts.length
        );

        console.log(
            "Relevant documents retrieved:",
            relevantRetrieved
        );

        console.log(
            "Recall@3:",
            recall.toFixed(2)
        );

        console.log(
            "Recall@3 %:",
            (recall * 100).toFixed(2) + "%"
        );

        totalRecall += recall;
    }

    // 5. Calculate average Recall@3
    const averageRecall =
        totalRecall / evaluationData.length;

    console.log("\n=================================");
    console.log("TOTAL QUESTIONS:", evaluationData.length);
    console.log("AVERAGE RECALL@3:", averageRecall.toFixed(2));

    console.log(
        "AVERAGE RECALL@3 %:",
        (averageRecall * 100).toFixed(2) + "%"
    );

    let totalContextPrecision = 0;

for (const item of evaluationData) {

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: item.question
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

    let relevantCount = 0;
    let precisionSum = 0;

    for (let i = 0; i < searchResponse.points.length; i++) {

        const retrievedResult =
            searchResponse.points[i];

        const found =
            item.relevantTexts.some(
                expectedText =>
                    retrievedResult.payload.text
                        .toLowerCase()
                        .includes(
                            expectedText.toLowerCase()
                        )
            );

        if (found) {

            relevantCount++;

            const precisionAtK =
                relevantCount / (i + 1);

            precisionSum += precisionAtK;
        }
    }

    let contextPrecision = 0;

    if (relevantCount > 0) {
        contextPrecision =
            precisionSum / relevantCount;
    }

    console.log(
        "\nQuestion:",
        item.question
    );

    console.log(
        "Context Precision:",
        contextPrecision
    );

    totalContextPrecision += contextPrecision;
}

const averageContextPrecision =
    totalContextPrecision /
    evaluationData.length;

console.log(
    "\nAVERAGE CONTEXT PRECISION:",
    averageContextPrecision
);

let totalContextRecall = 0;

for (const item of evaluationData) {

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: item.question
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

    let retrievedRelevant = 0;

    for (const expectedText of item.relevantTexts) {

        const found =
            searchResponse.points.some(
                result =>
                    result.payload.text
                        .toLowerCase()
                        .includes(
                            expectedText.toLowerCase()
                        )
            );

        if (found) {
            retrievedRelevant++;
        }
    }

    const contextRecall =
        retrievedRelevant /
        item.relevantTexts.length;

    console.log(
        "\nQuestion:",
        item.question
    );

    console.log(
        "Context Recall:",
        contextRecall
    );

    totalContextRecall += contextRecall;
}

const averageContextRecall =
    totalContextRecall /
    evaluationData.length;

console.log(
    "\nAVERAGE CONTEXT RECALL:",
    averageContextRecall
);

console.log(
    "AVERAGE CONTEXT RECALL %:",
    (averageContextRecall * 100).toFixed(2) + "%"
);

} catch (error) {
    console.error("Evaluation failed:");
    console.error(error);
}
