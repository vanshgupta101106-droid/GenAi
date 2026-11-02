import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { tavily } from "@tavily/core";

dotenv.config();

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

const COLLECTION_NAME = "employee_documents";

const question =
    "What are the latest ESOP regulations?";

const classificationPrompt = `
You are a query routing system.

Decide which strategy should be used to answer
the user's question.

Available strategies:

- simple: The question can be answered directly
  without retrieving external or internal documents.

- internal: The question requires information from
  the company's internal knowledge base.

- web: The question requires current or external
  information that may not exist in the internal
  knowledge base.

Return ONLY valid JSON:

{
    "route": "simple"
}

User question:
${question}
`;

const classificationResponse =
    await client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: classificationPrompt,
        config: {
            responseMimeType: "application/json"
        }
    });

const classification =
    JSON.parse(classificationResponse.text);

console.log("\nQUERY CLASSIFICATION:");
console.log(classification);

if (classification.route === "simple") {

    console.log("\nROUTE: SIMPLE");
    console.log("Answering directly with Gemini...");

    const response =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: question
        });

    console.log("\nFINAL ANSWER:");
    console.log(response.text);
}

else if (classification.route === "internal") {

    console.log("\nROUTE: INTERNAL");
    console.log("Using internal Qdrant knowledge base...");

    const embeddingResponse =
        await client.models.embedContent({
            model: "gemini-embedding-001",
            contents: question
        });

    const queryEmbedding =
        embeddingResponse.embeddings[0].values;

    const searchResponse =
        await qdrant.query(
            COLLECTION_NAME,
            {
                query: queryEmbedding,
                limit: 3,
                with_payload: true
            }
        );
    
    const context =
    searchResponse.points
        .map(result => result.payload.text)
        .join("\n");

    const response =
    await client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `
    Answer the question using ONLY the internal context.

    Context:
    ${context}

    Question:
    ${question}

    If the answer is not present in the context,
    say "I don't know based on the internal information."

    Answer clearly and concisely.
    `
    });

    console.log("\nFINAL ANSWER:");
    console.log(response.text);

    console.log("\nINTERNAL SEARCH RESULTS:");

    for (const result of searchResponse.points) {

        console.log("ID:", result.id);
        console.log("Score:", result.score);
        console.log("Text:", result.payload.text);
        console.log("--------------------");
    }

}

else if (classification.route === "web") {

    console.log("\nROUTE: WEB");
    console.log("Using external web search...");

    const webResponse =
        await tvly.search(question);

    const webContext =
    webResponse.results
        .map((result, index) => `
    Source ${index + 1}:
    Title: ${result.title}
    URL: ${result.url}
    Content: ${result.content}
    `)
        .join("\n");

    console.log("\nWEB SEARCH RESULTS:");

    const response =
    await client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `
    Answer the question using the external search results.

    Question:
    ${question}

    Search results:
    ${webContext}

    Use only information supported by the search results.
    If the search results do not contain enough information,
    say "I don't know."

    Answer clearly and concisely.
    `
    });

    console.log("\nFINAL ANSWER:");
    console.log(response.text);

    console.log("\nSOURCES:");

    for (const result of webResponse.results) {
        console.log("-", result.title);
        console.log(" ", result.url);
    }

    for (const result of webResponse.results) {

        console.log("TITLE:", result.title);
        console.log("URL:", result.url);
        console.log("CONTENT:", result.content);
        console.log("--------------------");
    }

}

else {

    console.log("\nUNKNOWN ROUTE:");
    console.log(classification.route);

    console.log(
        "\nFalling back to direct Gemini..."
    );

    const response =
        await client.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: question
        });

    console.log("\nFINAL ANSWER:");
    console.log(response.text);
}