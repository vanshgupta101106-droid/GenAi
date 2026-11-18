import "dotenv/config";

import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";


const loader = new TextLoader(
    "docs/nodejs-errors.md"
);

const documents = await loader.load();

console.log("\nORIGINAL DOCUMENTS:");
console.log(documents.length);


const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 20
});

const chunks = await splitter.splitDocuments(documents);

console.log("\nCHUNKS:");
console.log(chunks.length);


for (let i = 0; i < chunks.length; i++) {
    console.log(`\n--- CHUNK ${i + 1} ---`);
    console.log(chunks[i].pageContent);
}


const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY
});


const vectorStore =
    await QdrantVectorStore.fromDocuments(
        chunks,
        embeddings,
        {
            url: process.env.QDRANT_URL!,
            apiKey: process.env.QDRANT_API_KEY,
            collectionName: "developer_ingestion_docs"
        }
    );


console.log(
    "\nChunks successfully stored in Qdrant."
);