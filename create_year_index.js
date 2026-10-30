import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION_NAME = "employee_documents";

await qdrant.createPayloadIndex(
    COLLECTION_NAME,
    {
        field_name: "year",
        field_schema: "integer"
    }
);

console.log("Year index created successfully.");