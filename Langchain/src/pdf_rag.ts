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


const chain = RunnableMap.from({

    question: (input: string) => input,

    context: retriever.pipe(
        (docs) =>
            docs
                .map(doc => doc.pageContent)
                .join("\n\n")
    )

})
    .pipe(prompt)
    .pipe(model)
    .pipe(new StringOutputParser());


const question =
    "What are the common causes of ECONNREFUSED in a Node.js application, and how can they be diagnosed?";


const answer =
    await chain.invoke(question);


console.log("\nFINAL ANSWER:");
console.log(answer);