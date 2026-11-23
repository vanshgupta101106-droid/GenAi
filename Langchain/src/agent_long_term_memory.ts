import fs from "fs/promises";

const MEMORY_FILE = "./memory/user_memory.json";

const saveMemory = async (
    userId: string,
    key: string,
    value: string
) => {

    let memories: Record<string, Record<string, string>> = {};

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


const getMemory = async (
    userId: string,
    key: string
) => {

    try {

        const data = await fs.readFile(
            MEMORY_FILE,
            "utf-8"
        );

        const memories = JSON.parse(data);

        return memories[userId]?.[key];

    } catch {

        return undefined;
    }
};


await saveMemory(
    "user-123",
    "database",
    "PostgreSQL"
);

const database = await getMemory(
    "user-123",
    "database"
);

console.log("Stored database:", database);