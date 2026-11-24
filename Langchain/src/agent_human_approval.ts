import "dotenv/config";

import {
    createAgent,
    tool,
    humanInTheLoopMiddleware
} from "langchain";

import { z } from "zod";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { MemorySaver } from "@langchain/langgraph-checkpoint";

import { Command } from "@langchain/langgraph";


const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0
});


const deleteDatabase = tool(
    async () => {

        console.log("\n>>> DELETE DATABASE TOOL EXECUTED");

        return "Database deletion completed.";
    },
    {
        name: "delete_database",

        description:
            "Delete the PostgreSQL database. This is a destructive operation.",

        schema: z.object({})
    }
);


const hitlMiddleware = humanInTheLoopMiddleware({

    interruptOn: {

        delete_database: {
            allowedDecisions: [
                "approve",
                "reject"
            ],

            description:
                "⚠️ Database deletion requires human approval."
        }
    }
});


const checkpointer = new MemorySaver();


const agent = createAgent({

    model,

    tools: [
        deleteDatabase
    ],

    middleware: [
        hitlMiddleware
    ],

    checkpointer
});


const config = {

    configurable: {
        thread_id: "database-deletion-demo"
    }
};


const firstResult = await agent.invoke(

    {
        messages: [
            {
                role: "user",

                content:
                    "Use the delete_database tool to delete the PostgreSQL database."
            }
        ]
    },

    config
);


console.log("\n===== INTERRUPT =====");

console.dir(firstResult.__interrupt__, {
    depth: null
});


const resumeResult = await agent.invoke(

    new Command({
        resume: {
            decisions: [
                {
                    type: "approve"
                }
            ]
        }
    }),

    config
);


console.log("\n===== FINAL RESULT =====");

console.dir(resumeResult, {
    depth: null
});