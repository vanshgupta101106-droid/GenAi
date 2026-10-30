import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION_NAME = "employee_documents";

await qdrant.setPayload(
    COLLECTION_NAME,
    {
        points: [1, 2, 3, 4, 5, 6],
        payload: {
            year: 2026
        }
    }
);

console.log("Year metadata added successfully.");