import dotenv from "dotenv";
import { tavily } from "@tavily/core";

dotenv.config();

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

const query =
    "employee stock option policy ESOP vesting schedule";

const response = await tvly.search(query);

console.log("\nWEB SEARCH RESULTS:\n");

for (const result of response.results) {
    console.log("TITLE:", result.title);
    console.log("URL:", result.url);
    console.log("CONTENT:", result.content);
    console.log("----------------------------");
}