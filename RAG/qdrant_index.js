import "./loadEnv.js";
import { QdrantClient } from "@qdrant/js-client-rest";



const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION_NAME = "employee_documents";

try {

    await qdrant.createPayloadIndex(
        COLLECTION_NAME,
        {
            field_name: "department",
            field_schema: "keyword"
        }
    );

    console.log("Department index created successfully!");

} catch (error) {

    console.error("Index creation failed:");
    console.error(error);

}