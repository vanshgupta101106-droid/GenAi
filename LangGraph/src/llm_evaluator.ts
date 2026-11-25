import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0
});

const EvaluationSchema = z.object({
    enoughInformation: z.boolean(),
    reason: z.string()
});

const evaluator = model.withStructuredOutput(
    EvaluationSchema
);

const question =
    "Why is my Node.js API getting ECONNREFUSED from PostgreSQL?";

const retrievedInformation = `
PostgreSQL normally listens on port 5432.
ECONNREFUSED can occur when PostgreSQL is not running
or the application is connecting to the wrong host or port.
`;

const result = await evaluator.invoke([
    {
        role: "system",
        content:
            "You evaluate whether the provided information is sufficient to answer the user's question. Return enoughInformation=true only when the information is sufficient. Otherwise return false."
    },
    {
        role: "user",
        content: `
Question:
${question}

Retrieved information:
${retrievedInformation}
`
    }
]);

console.log("\n===== EVALUATION =====");
console.log(result);