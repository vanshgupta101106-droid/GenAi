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
    "Employees receive 20 days of paid annual leave.",
    "Employees can work remotely two days per week.",
    "The company provides health insurance to full-time employees.",
    "Employees must submit leave requests to their manager."
];


const points = [];

for (let i = 0; i < documents.length; i++) {

    const document = documents[i];

    console.log(`Creating embedding for document ${i + 1}...`);

    const response = await client.models.embedContent({
        model: "gemini-embedding-001",
        contents: document
    });

    const embedding = response.embeddings[0].values;

    points.push({
        id: i + 1,

        vector: embedding,

        payload: {
            text: document
        }
    });
}


console.log("Uploading documents to Qdrant...");


await qdrant.upsert(COLLECTION_NAME, {
    points: points
});


console.log("Documents uploaded successfully!");