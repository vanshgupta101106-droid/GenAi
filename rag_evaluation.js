import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenAI } from "@google/genai";

dotenv.config();


// ===============================
// CLIENT SETUP
// ===============================

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const COLLECTION_NAME = "employee_documents";


// ===============================
// EVALUATION DATA
// ===============================

const evaluationData = [

    {
        question: "How many vacation days do employees get?",

        contexts: [
            "Employees receive 20 days of paid annual leave."
        ],

        groundTruth:
            "Employees receive 20 days of paid annual leave."
    },

    {
        question: "How many days can employees work remotely?",

        contexts: [
            "Employees can work remotely two days per week."
        ],

        groundTruth:
            "Employees can work remotely two days per week."
    },

    {
        question: "What healthcare benefit does the company provide?",

        contexts: [
            "The company provides health insurance to full-time employees."
        ],

        groundTruth:
            "The company provides health insurance to full-time employees."
    },

    {
        question: "Who must approve leave requests?",

        contexts: [
            "Employees must submit leave requests to their manager."
        ],

        groundTruth:
            "The provided information does not specify who approves leave requests; it only states that requests must be submitted to the employee's manager."
    },

    {
        question: "What is the company's leave policy?",

        contexts: [
            "Employees receive 20 days of paid annual leave.",
            "Employees must submit leave requests to their manager."
        ],

        groundTruth:
            "Employees receive 20 days of paid annual leave, and leave requests must be submitted to the employee's manager."
    }

];


// ===============================
// RETRIEVAL FUNCTION
// ===============================

async function retrieveDocuments(question) {

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

    return searchResponse.points;
}


// ===============================
// GENERATE ANSWER
// ===============================

async function generateAnswer(question, context) {

    const prompt = `
    Answer the question using only the provided context.

    Context:
    ${context}

    Question:
    ${question}

    Answer clearly and concisely.
    `;

    const response =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });

    return response.text.trim();
}


// ===============================
// MAIN EVALUATION
// ===============================

let totalRecall = 0;
let totalContextPrecision = 0;
let totalContextRecall = 0;
let totalFaithfulness = 0;
let totalAnswerRelevance = 0;
let totalAnswerCorrectness = 0;


for (const item of evaluationData) {

    console.log("\n=================================");
    console.log("QUESTION:", item.question);


    // --------------------------------
    // 1. RETRIEVE DOCUMENTS ONCE
    // --------------------------------

    const retrievedDocuments =
        await retrieveDocuments(item.question);


    const retrievedContexts =
        retrievedDocuments.map(
            result => result.payload.text
        );


    const context =
        retrievedContexts.join("\n");


    console.log("\nRETRIEVED CONTEXT:");
    console.log(context);


    // =================================
    // 2. RECALL@3
    // =================================

    let relevantRetrieved = 0;

    for (const expectedText of item.contexts) {

        const found =
            retrievedDocuments.some(
                result =>
                    result.payload.text
                        .toLowerCase()
                        .includes(
                            expectedText.toLowerCase()
                        )
            );

        if (found) {
            relevantRetrieved++;
        }
    }


    const recall =
        relevantRetrieved /
        item.contexts.length;


    console.log("\nRecall@3:", recall);


    totalRecall += recall;


    // =================================
    // 3. CONTEXT PRECISION
    // =================================

    let relevantCount = 0;
    let precisionSum = 0;


    for (
        let i = 0;
        i < retrievedDocuments.length;
        i++
    ) {

        const retrievedResult =
            retrievedDocuments[i];


        const found =
            item.contexts.some(
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
            precisionSum /
            relevantCount;
    }


    console.log(
        "Context Precision:",
        contextPrecision
    );


    totalContextPrecision +=
        contextPrecision;


    // =================================
    // 4. CONTEXT RECALL
    // =================================

    let retrievedRelevant = 0;


    for (const expectedText of item.contexts) {

        const found =
            retrievedDocuments.some(
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
        item.contexts.length;


    console.log(
        "Context Recall:",
        contextRecall
    );


    totalContextRecall +=
        contextRecall;


    // =================================
    // 5. GENERATE ANSWER
    // =================================

    const answer =
        await generateAnswer(
            item.question,
            context
        );


    console.log("\nGENERATED ANSWER:");
    console.log(answer);


    console.log("\nGROUND TRUTH:");
    console.log(item.groundTruth);


    // =================================
    // 6. FAITHFULNESS
    // =================================

    const faithfulnessPrompt = `
    You are a faithfulness evaluator.

    Determine whether the answer is fully supported
    by the provided context.

    Context:
    ${context}

    Answer:
    ${answer}

    Return ONLY valid JSON:

    {
        "faithful": true
    }

    Use:
    - true if the answer is fully supported by the context
    - false if the answer contains information that is not
    supported by the context
    `;

    const faithfulnessResponse =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: faithfulnessPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });


    const faithfulness =
        JSON.parse(
            faithfulnessResponse.text
        );


    console.log(
        "\nFaithfulness:",
        faithfulness
    );


    if (faithfulness.faithful) {

        totalFaithfulness += 1;
    }


    // =================================
    // 7. ANSWER RELEVANCE
    // =================================

    const relevancePrompt = `
    You are an answer relevance evaluator.

    Determine whether the answer directly addresses
    the user's question.

    Question:
    ${item.question}

    Answer:
    ${answer}

    Return ONLY valid JSON:

    {
        "relevant": true
    }

    Use:
    - true if the answer directly addresses the question
    - false if the answer does not answer the question
    or is unrelated
    `;


    const relevanceResponse =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: relevancePrompt,
            config: {
                responseMimeType: "application/json"
            }
        });


    const relevance =
        JSON.parse(
            relevanceResponse.text
        );


    console.log(
        "Answer Relevance:",
        relevance
    );


    if (relevance.relevant) {

        totalAnswerRelevance += 1;
    }

    // =================================
    // 8. ANSWER CORRECTNESS
    // =================================

    const correctnessPrompt = `
    You are an answer correctness evaluator.

    Compare the generated answer with the ground truth.

    Question:
    ${item.question}

    Generated answer:
    ${answer}

    Ground truth:
    ${item.groundTruth}

    Return ONLY valid JSON:

    {
        "correct": true
    }

    Use:
    - true if the generated answer is factually consistent
    with the ground truth
    - false if the generated answer contradicts the ground truth
    or gives an incorrect answer
    `;

    const correctnessResponse =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: correctnessPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });

    const correctness =
        JSON.parse(correctnessResponse.text);

    console.log(
        "Answer Correctness:",
        correctness
    );

    if (correctness.correct) {
        totalAnswerCorrectness += 1;
    }

}


// =================================
// FINAL RESULTS
// =================================

const averageRecall =
    totalRecall /
    evaluationData.length;


const averageContextPrecision =
    totalContextPrecision /
    evaluationData.length;


const averageContextRecall =
    totalContextRecall /
    evaluationData.length;


const averageFaithfulness =
    totalFaithfulness /
    evaluationData.length;


const averageAnswerRelevance =
    totalAnswerRelevance /
    evaluationData.length;


const averageAnswerCorrectness =
    totalAnswerCorrectness /
    evaluationData.length;


// =================================
// SUMMARY
// =================================

console.log("\n\n=================================");
console.log("        RAG EVALUATION SUMMARY");
console.log("=================================");

console.log(
    "\nRecall@3:",
    (averageRecall * 100).toFixed(2) + "%"
);

console.log(
    "Context Precision:",
    (averageContextPrecision * 100).toFixed(2) + "%"
);

console.log(
    "Context Recall:",
    (averageContextRecall * 100).toFixed(2) + "%"
);

console.log(
    "Faithfulness:",
    (averageFaithfulness * 100).toFixed(2) + "%"
);

console.log(
    "Answer Relevance:",
    (averageAnswerRelevance * 100).toFixed(2) + "%"
);

console.log(
    "Answer Correctness:",
    (averageAnswerCorrectness * 100).toFixed(2) + "%"
);

console.log("\n=================================");