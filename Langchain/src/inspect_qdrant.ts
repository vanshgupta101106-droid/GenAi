import "dotenv/config";

import { QdrantClient } from "@qdrant/js-client-rest";

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY
});

const result = await qdrant.scroll(
    "developer_docs",
    {
        limit: 3,
        with_payload: true,
        with_vector: false
    }
);

console.dir(result.points, { depth: null });