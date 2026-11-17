import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

const loader = new TextLoader(
    "docs/nodejs-errors.md"
);

const documents = await loader.load();

console.log("\nLOADED DOCUMENTS:");

for (const doc of documents) {
    console.log("\nContent:");
    console.log(doc.pageContent);

    console.log("\nMetadata:");
    console.log(doc.metadata);
}