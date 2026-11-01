
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
const EMBEDDING_MODEL = "gemini-embedding-001";
const MODEL = "gemini-3.1-flash-lite";

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
    let totalContextPrecision = 0;
    let totalContextRecall = 0;
    let totalFaithfulness = 0;
    let totalAnswerRelevance = 0;

    for (const item of evaluationData) {
        console.log("\n=================================");
        console.log("QUESTION:", item.question);

        // STEP 1: Generate question embedding
        const embeddingResponse =
            await client.models.embedContent({
                model: EMBEDDING_MODEL,
                contents: item.question
            });

        const queryEmbedding =
            embeddingResponse.embeddings[0].values;

        // STEP 2: Retrieve top 3 documents
        const searchResponse =
            await qdrant.query(
                COLLECTION_NAME,
                {
                    query: queryEmbedding,
                    limit: 3,
                    with_payload: true
                }
            );

        const retrievedPoints =
            searchResponse.points;

        console.log("\nRETRIEVED DOCUMENTS:");

        retrievedPoints.forEach((result, index) => {
            console.log("\nRank:", index + 1);
            console.log("ID:", result.id);
            console.log("Score:", result.score);
            console.log("Text:", result.payload?.text);
        });

        // STEP 3: Prepare context
        const context =
            retrievedPoints
                .map(result => result.payload?.text || "")
                .filter(Boolean)
                .join("\n");

        console.log("\nRETRIEVED CONTEXT:");
        console.log(context);

        // STEP 4: Calculate Recall@3
        let relevantRetrieved = 0;

        for (const relevantText of item.relevantTexts) {
            const found = retrievedPoints.some(
                result =>
                    result.payload?.text
                        ?.toLowerCase()
                        .includes(relevantText.toLowerCase())
            );

            if (found) {
                relevantRetrieved++;
            }
        }

        const recall =
            relevantRetrieved / item.relevantTexts.length;

        console.log("\nRECALL@3:", recall.toFixed(2));

        totalRecall += recall;

        // STEP 5: Calculate Context Precision
        let relevantCount = 0;
        let precisionSum = 0;

        for (let i = 0; i < retrievedPoints.length; i++) {
            const retrievedText =
                retrievedPoints[i].payload?.text?.toLowerCase() || "";

            const found = item.relevantTexts.some(
                expectedText =>
                    retrievedText.includes(expectedText.toLowerCase())
            );

            if (found) {
                relevantCount++;

                const precisionAtK =
                    relevantCount / (i + 1);

                precisionSum += precisionAtK;
            }
        }

        const contextPrecision =
            relevantCount > 0
                ? precisionSum / relevantCount
                : 0;

        console.log(
            "CONTEXT PRECISION:",
            contextPrecision.toFixed(2)
        );

        totalContextPrecision += contextPrecision;

        // STEP 6: Calculate Context Recall
        const contextRecall =
            relevantRetrieved / item.relevantTexts.length;

        console.log(
            "CONTEXT RECALL:",
            contextRecall.toFixed(2)
        );

        totalContextRecall += contextRecall;

        // STEP 7: Generate answer
        const answerPrompt = `
        Answer the question using only the provided context.

        Context:
        ${context || "No documents retrieved."}

        Question:
        ${item.question}

        If the context does not contain the answer,
        say that the information is unavailable.

        Answer clearly and concisely.
        `;

        const answerResponse =
            await client.models.generateContent({
                model: MODEL,
                contents: answerPrompt
            });

        const answer =
            answerResponse.text.trim();

        console.log("\nGENERATED ANSWER:");
        console.log(answer);

        // STEP 8: Evaluate Faithfulness
        const faithfulnessPrompt = `
        You are a faithfulness evaluator.

        Determine whether the generated answer is fully supported
        by the provided context.

        Context:
        ${context || "No documents retrieved."}

        Question:
        ${item.question}

        Generated answer:
        ${answer}

        Return ONLY valid JSON:

        {
            "faithful": true,
            "reason": "..."
        }

        Set faithful to:
        - true if every factual claim is supported by the context
        - false if any factual claim is unsupported

        Do not use outside knowledge.
        `;

        const faithfulnessResponse =
            await client.models.generateContent({
                model: MODEL,
                contents: faithfulnessPrompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

        const faithfulness =
            JSON.parse(faithfulnessResponse.text);

        console.log("\nFAITHFULNESS EVALUATION:");
        console.log("Faithful:", faithfulness.faithful);
        console.log("Reason:", faithfulness.reason);

        if (faithfulness.faithful) {
            totalFaithfulness++;
            console.log("RESULT: FAITHFUL");
        } else {
            console.log("RESULT: NOT FAITHFUL");
        }

        // STEP 9: Evaluate Answer Relevance
        const relevancePrompt = `
        You are an answer relevance evaluator.

        Determine whether the generated answer directly
        addresses the user's question.

        Question:
        ${item.question}

        Generated answer:
        ${answer}

        Return ONLY valid JSON:

        {
            "relevant": true,
            "reason": "..."
        }

        Set relevant to:
        - true if the answer directly and meaningfully addresses
        the question
        - false if the answer is unrelated, off-topic,
        or does not answer the question

        Do not use outside knowledge.
        `;

        const relevanceResponse =
            await client.models.generateContent({
                model: MODEL,
                contents: relevancePrompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

        const relevance =
            JSON.parse(relevanceResponse.text);

        console.log("\nANSWER RELEVANCE EVALUATION:");
        console.log("Relevant:", relevance.relevant);
        console.log("Reason:", relevance.reason);

        if (relevance.relevant) {
            totalAnswerRelevance++;
            console.log("RESULT: RELEVANT");
        } else {
            console.log("RESULT: NOT RELEVANT");
        }
    }

    // STEP 10: Calculate average metrics
    const totalQuestions = evaluationData.length;

    const averageRecall =
        totalRecall / totalQuestions;

    const averageContextPrecision =
        totalContextPrecision / totalQuestions;

    const averageContextRecall =
        totalContextRecall / totalQuestions;

    const averageFaithfulness =
        totalFaithfulness / totalQuestions;

    const averageAnswerRelevance =
        totalAnswerRelevance / totalQuestions;

    // STEP 11: Display final results
    console.log("\n=================================");
    console.log("FINAL RAG EVALUATION RESULTS");

    console.log(
        "\nAVERAGE RECALL@3:",
        (averageRecall * 100).toFixed(2) + "%"
    );

    console.log(
        "AVERAGE CONTEXT PRECISION:",
        (averageContextPrecision * 100).toFixed(2) + "%"
    );

    console.log(
        "AVERAGE CONTEXT RECALL:",
        (averageContextRecall * 100).toFixed(2) + "%"
    );

    console.log(
        "AVERAGE FAITHFULNESS:",
        (averageFaithfulness * 100).toFixed(2) + "%"
    );

    console.log(
        "AVERAGE ANSWER RELEVANCE:",
        (averageAnswerRelevance * 100).toFixed(2) + "%"
    );

    console.log("\nTOTAL QUESTIONS:", totalQuestions);
    console.log("FAITHFUL ANSWERS:", totalFaithfulness);
    console.log("RELEVANT ANSWERS:", totalAnswerRelevance);

    console.log(
        "UNFAITHFUL ANSWERS:",
        totalQuestions - totalFaithfulness
    );

    console.log(
        "IRRELEVANT ANSWERS:",
        totalQuestions - totalAnswerRelevance
    );

} catch (error) {
    console.error("\nEvaluation failed:");
    console.error(error);
}
