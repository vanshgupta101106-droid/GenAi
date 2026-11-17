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
            collectionName: "developer_edit_docs",
            contentPayloadKey: "content"
        }
    );

const retriever = vectorStore.asRetriever({
    k: 2
});

const prompt = ChatPromptTemplate.fromTemplate(`
You are a developer assistant.

Answer the question using only the provided context.

Context:
{context}

Question:
{question}

If the answer is not present in the context,
say "I don't know based on the provided documentation."
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
    "Why am I getting ECONNREFUSED in Node.js?";

const answer = await chain.invoke(question);

console.log("\nFINAL ANSWER:");
console.log(answer);