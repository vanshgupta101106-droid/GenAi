import "dotenv/config";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getDatabaseStatus = tool(
    async () => {
        return {
            status: "healthy",
            database: "PostgreSQL",
            connections: 12
        };
    },
    {
        name: "get_database_status",
        description:
            "Get the current status of the PostgreSQL database.",
        schema: z.object({})
    }
);

const getServerStatus = tool(
    async () => {
        return {
            status: "running",
            server: "Node.js API",
            uptime: "2 hours"
        };
    },
    {
        name: "get_server_status",
        description:
            "Get the current status and uptime of the Node.js server.",
        schema: z.object({})
    }
);

const getServerLogs = tool(
    async ({ service }) => {

        if (service !== "nodejs" && service !== "postgresql") {
            throw new Error(
                `Logs are not available for ${service}.`
            );
        }

        return {
            service,
            errors: [
                `ECONNREFUSED error detected in ${service}`,
                "Connection failed on port 5432"
            ]
        };
    },
    {
        name: "get_server_logs",
        description:
            "Get recent errors from the logs of a specific service. Logs are available for nodejs and postgresql.",
        schema: z.object({
            service: z.string().describe(
                "The service whose logs should be checked"
            )
        })
    }
);

const checkRedisStatus = tool(
    async () => {
        return {
            status: "healthy",
            redis: "Redis",
            memoryUsage: "128 MB",
            connections: 8
        };
    },
    {
        name: "check_redis_status",
        description:
            "Check whether the Redis server is healthy and return its current connection information.",
        schema: z.object({})
    }
);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const agent = createAgent({
    model,
    tools: [
        getDatabaseStatus,
        getServerStatus,
        getServerLogs,
        checkRedisStatus
    ]
});

const result = await agent.invoke({
    messages: [
        {
            role: "user",
            content:
                "Check the PostgreSQL logs and tell me what errors are occurring."
        }
    ]
});

console.dir(result, { depth: null });

const result1 = await agent.invoke({
    messages: [
        {
            role: "user",
            content:
                "Check the MongoDB logs and tell me what errors are occurring."
        }
    ]
});

console.dir(result1, { depth: null });