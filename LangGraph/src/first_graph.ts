import { z } from "zod";

import {
    StateGraph,
    StateSchema,
    START,
    END
} from "@langchain/langgraph";


// STATE
const State = new StateSchema({
    message: z.string()
});


// NODE
const helloNode = async (
    state: typeof State.State
) => {

    console.log("Inside helloNode");

    console.log("Current message:", state.message);

    return {
        message: "Hello from LangGraph!"
    };
};


// GRAPH
const graph = new StateGraph(State)

    .addNode("hello", helloNode)

    .addEdge(START, "hello")

    .addEdge("hello", END)

    .compile();


// EXECUTE GRAPH
const result = await graph.invoke({
    message: "Hello World!"
});


// FINAL OUTPUT
console.log("\n===== FINAL STATE =====");

console.log(result);