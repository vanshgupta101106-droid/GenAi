import {
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings
} from "@langchain/google-genai";

import { QdrantVectorStore } from "@langchain/qdrant";

import { ChatPromptTemplate } from "@langchain/core/prompts";

import { RunnableMap } from "@langchain/core/runnables";

import { z } from "zod";


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


const prompt = ChatPromptTemplate.fromTemplate(`
You are a backend development assistant.

Answer the question using only the provided documentation.

Documentation:
{context}

Question:
{question}

If the documentation does not contain enough information,
say:

"I don't know based on the provided documentation."

Answer clearly and concisely.
`);


const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});


const responseSchema = z.object({
    answer: z.string(),
    confidence: z.enum([
        "high",
        "medium",
        "low"
    ])
});


const structuredModel =
    model.withStructuredOutput(responseSchema);


const retrieval = async (input: string) => {

    const docs = await retriever.invoke(input);

    const context = docs
        .map(doc => doc.pageContent)
        .join("\n\n");

    const sources = docs.map(doc => ({
        source: doc.metadata.source,
        page: doc.metadata.page
    }));

    return {
        context,
        sources
    };
};


const chain = RunnableMap.from({

    question: (input: string) => input,

    retrieval: retrieval

});


const question =
    "What are the common causes of ECONNREFUSED in a Node.js application, and how can they be diagnosed?";


const result =
    await chain.invoke(question);


const answer =
    await prompt
        .pipe(structuredModel)
        .invoke({
            question,
            context: result.retrieval.context
        });


const finalResult = {
    answer: answer.answer,
    confidence: answer.confidence,
    sources: result.retrieval.sources
};


console.log("\nFINAL RESULT:");

console.dir(
    finalResult,
    { depth: null }
);