import {
    StateGraph,
    StateSchema,
    START,
    END
} from "@langchain/langgraph";

import * as z from "zod";

const State = new StateSchema({
    question: z.string(),

    serverStatus: z.string().default("unknown"),

    databaseStatus: z.string().default("unknown"),

    logs: z.array(z.string()).default([]),

    diagnosis: z.string().default("")
});

const checkInfrastructure = async (
    state: typeof State.State
) => {
    console.log("\n--- CHECK INFRASTRUCTURE ---");

    console.log("Question:", state.question);

    const serverStatus = "running";
    const databaseStatus = "healthy";
    const logs = [
        "ECONNREFUSED detected on port 5432"
    ];

    console.log("Server:", serverStatus);
    console.log("Database:", databaseStatus);
    console.log("Logs:", logs);

    return {
        serverStatus,
        databaseStatus,
        logs
    };
};

const diagnose = async (
    state: typeof State.State
) => {
    console.log("\n--- DIAGNOSE ---");

    console.log("Server:", state.serverStatus);
    console.log("Database:", state.databaseStatus);
    console.log("Logs:", state.logs);

    let diagnosis = "No problem detected.";

    if (
        state.logs.some(log =>
            log.includes("ECONNREFUSED")
        )
    ) {
        diagnosis =
            "The application is experiencing a database connection problem.";
    }

    return {
        diagnosis
    };
};

const graph = new StateGraph(State)
    .addNode(
        "checkInfrastructure",
        checkInfrastructure
    )
    .addNode(
        "diagnose",
        diagnose
    )
    .addEdge(
        START,
        "checkInfrastructure"
    )
    .addEdge(
        "checkInfrastructure",
        "diagnose"
    )
    .addEdge(
        "diagnose",
        END
    )
    .compile();

const result = await graph.invoke({
    question:
        "Why is my Node.js API having connection problems?"
});

console.log("\n========== FINAL STATE ==========");

console.dir(result, {
    depth: null
});