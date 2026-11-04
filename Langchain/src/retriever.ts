import "dotenv/config";

import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY
});

const documents = [
    new Document({
        pageContent: `
ECONNREFUSED usually means that your application
tried to connect to a server, but no process was
listening on the specified host and port.
        `,
        metadata: {
            source: "nodejs-networking.md",
            category: "error"
        }
    }),

    new Document({
        pageContent: `
When a Node.js application cannot connect to PostgreSQL,
check whether PostgreSQL is running and verify the
DATABASE_URL environment variable.
        `,
        metadata: {
            source: "postgresql-troubleshooting.md",
            category: "database"
        }
    }),

    new Document({
        pageContent: `
For HTTP connection errors, verify that the target
service is running and that the configured port is correct.
        `,
        metadata: {
            source: "microservices-guide.md",
            category: "networking"
        }
    })
];

console.log(documents);

const vectorStore = await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
);

const results = await vectorStore.similaritySearch(
    "Why am I getting ECONNREFUSED in my Node.js application?",
    2
);

console.log("\nSEARCH RESULTS:");
console.log(results);

const retriever = vectorStore.asRetriever({
    k: 2
});

const results1 = await retriever.invoke(
    "Why am I getting ECONNREFUSED in my Node.js application?"
);

console.log("\nRETRIEVER RESULTS:");
console.log(results1);