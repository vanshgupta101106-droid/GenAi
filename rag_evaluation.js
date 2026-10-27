
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

} catch (error) {
    console.error("Evaluation failed:");
    console.error(error);
}
