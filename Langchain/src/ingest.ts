import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";

const documents = [
    new Document({
        pageContent: `
ECONNREFUSED means that a Node.js application
tried to connect to a server, but no process was
listening on the specified host and port.
        `,
        metadata: {
            source: "nodejs-errors.md",
            category: "nodejs"
        }
    }),

    new Document({
        pageContent: `
When PostgreSQL refuses a connection, first verify
that PostgreSQL is running and check that the
DATABASE_URL contains the correct host and port.
        `,
        metadata: {
            source: "postgresql.md",
            category: "database"
        }
    }),

    new Document({
        pageContent: `
Redis connection errors can occur when the Redis
server is not running or the application is using
the wrong Redis host or port.
        `,
        metadata: {
            source: "redis.md",
            category: "redis"
        }
    })
];

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY
});

await QdrantVectorStore.fromDocuments(
    documents,
    embeddings,
    {
        url: process.env.QDRANT_URL!,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: "developer_docs"
    }
);

console.log("Documents successfully ingested into Qdrant.");