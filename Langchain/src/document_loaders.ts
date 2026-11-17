import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

const loader = new TextLoader(
    "docs/nodejs-errors.md"
);

const documents = await loader.load();

console.log("\nNUMBER OF DOCUMENTS:");
console.log(documents.length);

console.log("\nDOCUMENT:");
console.log(documents[0]);

console.log("\nPAGE CONTENT:");
console.log(documents[0].pageContent);

console.log("\nMETADATA:");
console.log(documents[0].metadata);