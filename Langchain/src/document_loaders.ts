import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const loader = new TextLoader(
    "docs/nodejs-errors.md"
);

const documents = await loader.load();

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 20
});

const chunks = await splitter.splitDocuments(documents);

console.log("\nNUMBER OF ORIGINAL DOCUMENTS:");
console.log(documents.length);

console.log("\nNUMBER OF CHUNKS:");
console.log(chunks.length);

for (let i = 0; i < chunks.length; i++) {
    console.log(`\n--- CHUNK ${i + 1} ---`);
    console.log(chunks[i].pageContent);

    console.log("\nMetadata:");
    console.log(chunks[i].metadata);
}