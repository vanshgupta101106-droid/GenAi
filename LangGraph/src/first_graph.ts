import { z } from "zod";

import {
    StateGraph,
    StateSchema,
    START,
    END
} from "@langchain/langgraph";


const State = new StateSchema({
    message: z.string()
});


const greetNode = async (
    state: typeof State.State
) => {

    console.log("\n--- GREET NODE ---");

    console.log("Received:", state.message);

    return {
        message: "Hello! My name is LangGraph."
    };
};


const answerNode = async (
    state: typeof State.State
) => {

    console.log("\n--- ANSWER NODE ---");

    console.log("Received:", state.message);

    return {
        message: `${state.message} Nice to meet you!`
    };
};


const graph = new StateGraph(State)

    .addNode("greet", greetNode)

    .addNode("answer", answerNode)

    .addEdge(START, "greet")

    .addEdge("greet", "answer")

    .addEdge("answer", END)

    .compile();


const result = await graph.invoke({
    message: "Hello"
});


console.log("\n===== FINAL STATE =====");

console.log(result);