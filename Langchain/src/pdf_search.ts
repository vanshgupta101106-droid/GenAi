import "dotenv/config";

import {
    GoogleGenerativeAIEmbeddings
} from "@langchain/google-genai";

import { QdrantVectorStore } from "@langchain/qdrant";


const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY
});


const vectorStore =
    await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            url: process.env.QDRANT_URL!,
            apiKey: process.env.QDRANT_API_KEY,
            collectionName: "redis_langchain_docs"
        }
    );


const retriever = vectorStore.asRetriever({
    k: 3
});


const question =
    "What are the common causes of ECONNREFUSED in a Node.js application, and how can they be diagnosed?";


const results =
    await retriever.invoke(question);


console.log("\nRETRIEVED DOCUMENTS:");

for (const doc of results) {

    console.log("\n--------------------");

    console.log("\nCONTENT:");
    console.log(doc.pageContent);

    console.log("\nMETADATA:");
    console.log(doc.metadata);
}