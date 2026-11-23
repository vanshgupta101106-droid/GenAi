import fs from "fs/promises";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { z } from "zod";


// 1. Memory file

const MEMORY_FILE = "./memory/user_memory.json";


// 2. Gemini model

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0
});


// 3. Memory structure

const MemorySchema = z.object({

    memories: z.array(

        z.object({
            key: z.string(),
            value: z.string()
        })

    )

});


// 4. Structured Gemini model

const structuredModel =
    model.withStructuredOutput(
        MemorySchema
    );


// 5. Save memory

const saveMemory = async (
    userId: string,
    key: string,
    value: string
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


    memories[userId][key] = value;


    await fs.writeFile(
        MEMORY_FILE,
        JSON.stringify(memories, null, 2)
    );
};


// 6. User message

const userId = "user-123";

const userMessage =
    "I switched my backend database from PostgreSQL to MongoDB.";


// 7. Extract memories

const result = await structuredModel.invoke(
    `
Extract useful long-term user preferences
or facts from the following message.

Only extract information that could be
useful in future conversations.

If there is nothing useful to remember,
return an empty memories array.

User message:
${userMessage}
`
);


// 8. Save every extracted memory

for (const memory of result.memories) {

    const saveMemory = async (
        userId: string,
        key: string,
        value: string
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


        // Create memory object for user
        // if it doesn't exist

        if (!memories[userId]) {

            memories[userId] = {};

        }


        // Check whether this memory already exists

        const existingValue =
            memories[userId][key];


        // Case 1: memory does not exist

        if (existingValue === undefined) {

            memories[userId][key] = value;

            console.log(
                `CREATED: ${key} → ${value}`
            );

        }


        // Case 2: same memory already exists

        else if (existingValue === value) {

            console.log(
                `UNCHANGED: ${key} → ${value}`
            );

        }


        // Case 3: memory has changed

        else {

            console.log(
                `UPDATED: ${key}: ${existingValue} → ${value}`
            );

            memories[userId][key] = value;

        }


        await fs.writeFile(
            MEMORY_FILE,
            JSON.stringify(memories, null, 2)
        );
    };

}


// 9. Display result

console.log("\nEXTRACTED MEMORIES:");

console.dir(
    result,
    {
        depth: null
    }
);


console.log("\nMEMORY SAVED SUCCESSFULLY.");