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
    async () => {
        return {
            errors: [
                "ECONNREFUSED 127.0.0.1:5432",
                "Redis connection timeout"
            ],
            lastChecked: "2026-09-18 00:30"
        };
    },
    {
        name: "get_server_logs",
        description:
            "Get recent errors and warnings from the Node.js server logs.",
        schema: z.object({})
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
                "Check my Node.js server and PostgreSQL database. If anything is unhealthy, tell me what is wrong."
        }
    ]
});

console.dir(result, { depth: null });