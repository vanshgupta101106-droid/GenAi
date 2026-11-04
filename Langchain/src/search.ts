import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
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
            collectionName: "developer_docs",
            contentPayloadKey: "text"
        }
    );

const retriever = vectorStore.asRetriever({
    k: 2
});

const results = await retriever.invoke(
    "Why am I getting ECONNREFUSED in Node.js?"
);

console.log("\nSEARCH RESULTS:");

for (const doc of results) {
    console.log("\nContent:");
    console.log(doc.pageContent);

    console.log("Metadata:");
    console.log(doc.metadata);
}