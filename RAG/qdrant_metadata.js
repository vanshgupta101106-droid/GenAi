import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const COLLECTION_NAME = "employee_documents";

const documents = [
    {
        text: "Employees receive 20 days of paid annual leave.",
        department: "HR",
        source: "employee_handbook.pdf",
        page: 37
    },

    {
        text: "Employees can work remotely two days per week.",
        department: "HR",
        source: "employee_handbook.pdf",
        page: 42
    },

    {
        text: "The company provides health insurance to full-time employees.",
        department: "HR",
        source: "benefits.pdf",
        page: 12
    },

    {
        text: "Employees must submit leave requests to their manager.",
        department: "HR",
        source: "employee_handbook.pdf",
        page: 39
    },
    {
    text: "The finance department prepares the company's annual budget.",
    department: "Finance",
    source: "finance_policy.pdf",
    page: 5
    }
];

try {

    const points = [];

    for (let i = 0; i < documents.length; i++) {

        const document = documents[i];

        console.log(`Creating embedding ${i + 1}...`);

        const response = await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: document.text
        });

        const embedding = response.embeddings[0].values;

        points.push({
            id: i + 1,

            vector: embedding,

            payload: {
                text: document.text,
                department: document.department,
                source: document.source,
                page: document.page
            }
        });
    }

    console.log("Uploading documents...");

    await qdrant.upsert(
        COLLECTION_NAME,
        {
            points: points
        }
    );

    console.log("Documents uploaded successfully!");

} catch (error) {

    console.error("Error:");
    console.error(error);

}