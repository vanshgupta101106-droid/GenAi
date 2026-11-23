import fs from "fs/promises";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { z } from "zod";

const MEMORY_FILE = "./memory/user_memory.json";

// 1. Gemini model

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});


// 2. Define resolver output

const ResolutionSchema = z.object({

    action: z.enum([
        "CREATE",
        "UPDATE",
        "IGNORE"
    ]),

    key: z.string(),

    value: z.string(),

    reason: z.string()
});


// 3. Create structured resolver

const resolver =
    model.withStructuredOutput(
        ResolutionSchema
    );


// 4. Existing memories

const existingMemories = {
    database: "PostgreSQL",

    backend_tech_stack:
        "Node.js, PostgreSQL, and TypeScript"
};


// 5. New candidate memory

const newMemory = {
    key: "backend_database",

    value:
        "MongoDB (recently switched from PostgreSQL)"
};


// 6. Ask Gemini to resolve the conflict

const result = await resolver.invoke(
    `
You are a long-term memory resolver.

Determine whether the new memory should:

CREATE:
Create a new memory because it represents
a genuinely new fact.

UPDATE:
Update an existing memory because the new
information changes or corrects an existing fact.

IGNORE:
Ignore the new memory because it is already
represented by an existing memory.

Existing memories:
${JSON.stringify(existingMemories, null, 2)}

New memory:
${JSON.stringify(newMemory, null, 2)}

Compare the MEANING of the memories,
not just their exact keys.

Return the action, the final key and value
that should be stored, and a short reason.
`
);

const applyMemoryDecision = async (
    userId: string,
    decision: z.infer<typeof ResolutionSchema>
) => {

    let memories: Record<
        string,
        Record<string, string>
    > = {};

    try {

        const data = await fs.readFile(
            MEMORY_FILE,
            "utf-8"
        );

        memories = JSON.parse(data);

    } catch {

        memories = {};

    }


    if (!memories[userId]) {
        memories[userId] = {};
    }


    if (decision.action === "CREATE") {

        memories[userId][decision.key] =
            decision.value;

        console.log(
            `CREATED: ${decision.key} → ${decision.value}`
        );

    }


    else if (decision.action === "UPDATE") {

        const oldValue =
            memories[userId][decision.key];

        memories[userId][decision.key] =
            decision.value;

        console.log(
            `UPDATED: ${decision.key}: ${oldValue} → ${decision.value}`
        );

    }


    else if (decision.action === "IGNORE") {

        console.log(
            `IGNORED: ${decision.key} → ${decision.value}`
        );

    }


    await fs.writeFile(
        MEMORY_FILE,
        JSON.stringify(memories, null, 2)
    );
};

// 7. Display decision

console.log("\nMEMORY RESOLUTION:");

console.dir(
    result,
    {
        depth: null
    }
);

await applyMemoryDecision(
    "user-123",
    result
);