
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

const documents = [
    { id: 1, text: "Employees receive 20 days of paid annual leave." },
    { id: 2, text: "Employees can work remotely two days per week." },
    { id: 3, text: "The company provides health insurance to full-time employees." },
    { id: 4, text: "Employees must submit leave requests to their manager." },
    { id: 5, text: "The finance department prepares the company's annual budget." },
    { id: 6, text: "Employee ID EMP-48291 belongs to the Finance department." }
];

const question = "What department does EMP-48291 belong to?";

// =====================================
// STEP 1: VECTOR SEARCH
// =====================================

console.log("\nVECTOR SEARCH:");

const embeddingResponse = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: question
});

const queryEmbedding = embeddingResponse.embeddings[0].values;

const vectorResponse = await qdrant.query(
    COLLECTION_NAME,
    {
        query: queryEmbedding,
        limit: 6,
        with_payload: true
    }
);

const vectorRanking = vectorResponse.points.map(
    result => result.id
);

console.log("\nVECTOR RANKING:");
console.log(vectorRanking);

// =====================================
// STEP 2: BM25 SEARCH
// =====================================

function tokenize(text) {
    return text
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[.,]/g, ""));
}

function termFrequency(tokens, term) {
    let count = 0;

    for (const token of tokens) {
        if (token === term) {
            count++;
        }
    }

    return count;
}

function documentFrequency(documents, term) {
    let count = 0;

    for (const document of documents) {
        const tokens = tokenize(document.text);

        if (tokens.includes(term)) {
            count++;
        }
    }

    return count;
}

function inverseDocumentFrequency(documents, term) {
    const N = documents.length;
    const df = documentFrequency(documents, term);

    return Math.log(((N - df + 0.5) / (df + 0.5)) + 1);
}

function averageDocumentLength(documents) {
    let totalLength = 0;

    for (const document of documents) {
        totalLength += tokenize(document.text).length;
    }

    return totalLength / documents.length;
}

function bm25Score(document, query, documents, k1 = 1.2, b = 0.75) {
    const documentTokens = tokenize(document.text);
    const queryTokens = tokenize(query);

    const dl = documentTokens.length;
    const avgDl = averageDocumentLength(documents);

    let score = 0;

    for (const term of queryTokens) {
        const tf = termFrequency(documentTokens, term);
        const idf = inverseDocumentFrequency(documents, term);

        const denominator =
            tf + k1 * (1 - b + b * (dl / avgDl));

        const termScore =
            idf * ((tf * (k1 + 1)) / denominator);

        score += termScore;
    }

    return score;
}

const bm25Results = [];

for (const document of documents) {
    const score = bm25Score(document, question, documents);

    bm25Results.push({
        id: document.id,
        text: document.text,
        score: score
    });
}

bm25Results.sort((a, b) => b.score - a.score);

const bm25Ranking = bm25Results.map(result => result.id);

console.log("\nBM25 RANKING:");
console.log(bm25Ranking);

console.log("\nBM25 RESULTS:");

for (const result of bm25Results) {
    console.log(`ID: ${result.id} | Score: ${result.score}`);
    console.log(`Text: ${result.text}`);
}

// =====================================
// STEP 3: RRF HYBRID SEARCH
// =====================================

function calculateRRF(rankings, k = 60) {
    const scores = new Map();

    for (const ranking of rankings) {
        for (let i = 0; i < ranking.length; i++) {
            const documentId = ranking[i];
            const rank = i + 1;
            const score = 1 / (k + rank);

            const currentScore = scores.get(documentId) || 0;

            scores.set(documentId, currentScore + score);
        }
    }

    return scores;
}

const rrfScores = calculateRRF([
    vectorRanking,
    bm25Ranking
]);

const hybridResults = [...rrfScores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

const topHybridResults =
    hybridResults.slice(0, 3);

console.log("\nTOP HYBRID DOCUMENTS:");

for (const result of topHybridResults) {

    const document =
        documents.find(
            doc => doc.id === result.id
        );

    console.log(
        "\nID:",
        result.id
    );

    console.log(
        "RRF Score:",
        result.score
    );

    console.log(
        "Text:",
        document.text
    );
}

const context =
    topHybridResults
        .map(result => {

            const document =
                documents.find(
                    doc => doc.id === result.id
                );

            return document.text;
        })
        .join("\n");

console.log("\nHYBRID CONTEXT:");
console.log(context);

console.log("\nHYBRID RRF RESULTS:");

for (const result of hybridResults) {
    console.log(`ID: ${result.id} | RRF Score: ${result.score}`);
}

const prompt = `
Answer the question using only the provided context.

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
        model: "gemini-3.1-flash-lite",
        contents: prompt
    });

console.log("\nFINAL ANSWER:");
console.log(finalResponse.text);
