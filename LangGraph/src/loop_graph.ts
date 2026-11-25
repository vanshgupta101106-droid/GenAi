import { z } from "zod";
import {
    StateGraph,
    StateSchema,
    START,
    END
} from "@langchain/langgraph";


// -------------------------
// STATE
// -------------------------

const State = new StateSchema({
    count: z.number()
});


// -------------------------
// INCREMENT NODE
// -------------------------

const incrementNode = async (
    state: typeof State.State
) => {

    console.log("\n--- INCREMENT NODE ---");

    console.log("Current count:", state.count);

    return {
        count: state.count + 1
    };
};


// -------------------------
// CHECK NODE
// -------------------------

const checkNode = async (
    state: typeof State.State
) => {

    console.log("\n--- CHECK NODE ---");

    console.log("Checking count:", state.count);

    return {};
};


// -------------------------
// GRAPH
// -------------------------

const graph = new StateGraph(State)

    .addNode("increment", incrementNode)

    .addNode("check", checkNode)

    .addEdge(START, "increment")

    .addEdge("increment", "check")

    .addConditionalEdges(
        "check",

        (state) => {
            if (state.count >= 3) {
                return "done";
            }

            return "continue";
        },

        {
            continue: "increment",
            done: END
        }
    )

    .compile();


// -------------------------
// RUN
// -------------------------

const result = await graph.invoke({
    count: 0
});

console.log("\n===== FINAL STATE =====");

console.log(result);