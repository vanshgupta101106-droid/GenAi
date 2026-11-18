import {
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings
} from "@langchain/google-genai";

import { QdrantVectorStore } from "@langchain/qdrant";

import { ChatPromptTemplate } from "@langchain/core/prompts";

import { StringOutputParser } from "@langchain/core/output_parsers";

import { RunnableMap } from "@langchain/core/runnables";


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

If the documentation does not contain enough information
to answer the question, say:

"I don't know based on the provided documentation."

Answer clearly and concisely.
`);


const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});


const parser = new StringOutputParser();


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
        .pipe(model)
        .pipe(parser)
        .invoke({
            question,
            context: result.retrieval.context
        });


console.log("\nFINAL ANSWER:");
console.log(answer);


console.log("\nSOURCES:");

for (const source of result.retrieval.sources) {
    console.log(
        `- ${source.source} — Page ${source.page}`
    );
}