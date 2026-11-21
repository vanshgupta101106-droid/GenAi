import {
    StateGraph,
    StateSchema,
    START,
    END
} from "@langchain/langgraph";

import { MemorySaver } from "@langchain/langgraph-checkpoint";

import * as z from "zod";

const State = new StateSchema({
    counter: z.number().default(0),
    message: z.string().default("")
});

const increment = async (
    state: typeof State.State
) => {
    console.log("\nNODE EXECUTED");
    console.log("Counter before:", state.counter);

    return {
        counter: state.counter + 1,
        message: `Counter is now ${state.counter + 1}`
    };
};

const checkpointer = new MemorySaver();

const graph = new StateGraph(State)
    .addNode("increment", increment)
    .addEdge(START, "increment")
    .addEdge("increment", END)
    .compile({
        checkpointer
    });

const config = {
    configurable: {
        thread_id: "developer-copilot-2"
    }
};

console.log("\n========== FIRST INVOCATION ==========");

const result1 = await graph.invoke(
    {},
    config
);

console.log("Result 1:");
console.dir(result1, { depth: null });


console.log("\n========== SECOND INVOCATION ==========");

const result2 = await graph.invoke(
    {},
    config
);

console.log("Result 2:");
console.dir(result2, { depth: null });