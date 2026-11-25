import { retriever } from "./qdrant_retriever.js";

const question =
    "Why is my Node.js application getting ECONNREFUSED?";

console.log("\nQuestion:", question);

const results = await retriever.invoke(question);

console.log("\n===== RETRIEVED DOCUMENTS =====");

console.log("Total documents retrieved:", results.length);

console.log("Raw results:", results);

if (results.length === 0) {
    console.log("No documents found in the collection.");
}

for (const doc of results) {

    console.log("\nContent:");
    console.log(doc.pageContent);

    console.log("\nMetadata:");
    console.log(doc.metadata);
}