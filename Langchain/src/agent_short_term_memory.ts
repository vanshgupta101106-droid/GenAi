import {
    StateGraph,
    StateSchema,
    START,
    END,
    MessagesValue
} from "@langchain/langgraph";

import { MemorySaver } from "@langchain/langgraph-checkpoint";

import {
    HumanMessage
} from "@langchain/core/messages";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


// 1. Create Gemini model

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0
});


// 2. Define graph state

const State = new StateSchema({
    messages: MessagesValue
});


// 3. Create conversation node

const conversation = async (
    state: typeof State.State
) => {

    console.log("\nCURRENT CONVERSATION:");

    for (const message of state.messages) {

        console.log(
            `${message.getType()}: ${message.content}`
        );
    }


    // Send the complete conversation to Gemini

    const response = await model.invoke(
        state.messages
    );


    // Add Gemini's response to state

    return {
        messages: [response]
    };
};


// 4. Create memory

const checkpointer = new MemorySaver();


// 5. Create graph

const graph = new StateGraph(State)
    .addNode(
        "conversation",
        conversation
    )
    .addEdge(
        START,
        "conversation"
    )
    .addEdge(
        "conversation",
        END
    )
    .compile({
        checkpointer
    });


// 6. Identify this conversation

const config = {
    configurable: {
        thread_id: "developer-copilot-chat-1"
    }
};


// 7. First conversation turn

console.log("\n========== TURN 1 ==========");

await graph.invoke(
    {
        messages: [
            new HumanMessage(
                "My backend uses PostgreSQL."
            )
        ]
    },
    config
);


// 8. Second conversation turn

console.log("\n========== TURN 2 ==========");

const result = await graph.invoke(
    {
        messages: [
            new HumanMessage(
                "What database does my backend use?"
            )
        ]
    },
    config
);


// 9. Show final state

console.log("\n========== FINAL STATE ==========");

console.dir(
    result,
    {
        depth: null
    }
);