import "dotenv/config";

import {
    StateGraph,
    StateSchema,
    START,
    END
} from "@langchain/langgraph";

import { z } from "zod";


// ========================================
// 1. Graph State
// ========================================

const State = new StateSchema({
    question: z.string(),
    toolResult: z.string(),
    answer: z.string()
});


// ========================================
// 2. Tool
// ========================================

const getDatabaseStatus = async () => {

    console.log("\n🔧 Executing database status tool...");

    // Simulating a database health check
    return "PostgreSQL is running. Connection is healthy.";
};


// ========================================
// 3. Tool Node
// ========================================

const databaseNode = async () => {

    const result = await getDatabaseStatus();

    return {
        toolResult: result
    };
};


// ========================================
// 4. Generate Node
// ========================================

const generateNode = async (state: typeof State.State) => {

    console.log("\n🤖 Generating answer...");

    return {
        answer: `
Question: ${state.question}

Database Status:
${state.toolResult}
`
    };
};


// ========================================
// 5. Build Graph
// ========================================

const graph = new StateGraph(State)

    .addNode("database", databaseNode)
    .addNode("generate", generateNode)

    .addEdge(START, "database")
    .addEdge("database", "generate")
    .addEdge("generate", END)

    .compile();


// ========================================
// 6. Run
// ========================================

const result = await graph.invoke({
    question: "Is the PostgreSQL database healthy?",
    toolResult: "",
    answer: ""
});


console.log("\n===============================");
console.log("FINAL ANSWER");
console.log("===============================\n");

console.log(result.answer);