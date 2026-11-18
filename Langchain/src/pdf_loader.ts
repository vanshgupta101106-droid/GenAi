
import fs from "node:fs";
import { PDFParse } from "pdf-parse";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const pdfBuffer = fs.readFileSync("docs/developer_guide.pdf");

const parser = new PDFParse({
    data: pdfBuffer
});

const result = await parser.getText();

console.log("\nNUMBER OF PAGES:");
console.log(result.total);

const documents: Document[] = result.pages.map(
    (page) =>
        new Document({
            pageContent: page.text,
            metadata: {
                source: "docs/developer_guide.pdf",
                page: page.num
            }
        })
);

console.log("\nNUMBER OF DOCUMENTS:");
console.log(documents.length);

console.log("\nFIRST DOCUMENT:");
console.log(documents[0]);

console.log("\nPAGE CONTENT:");
console.log(documents[0].pageContent);

console.log("\nMETADATA:");
console.log(documents[0].metadata);

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50
});

const chunks = await splitter.splitDocuments(documents);

console.log("\nNUMBER OF CHUNKS:");
console.log(chunks.length);

for (let i = 0; i < Math.min(chunks.length, 5); i++) {
    console.log(`\n--- CHUNK ${i + 1} ---`);
    console.log(chunks[i].pageContent);

    console.log("\nMETADATA:");
    console.log(chunks[i].metadata);
}

await parser.destroy();
