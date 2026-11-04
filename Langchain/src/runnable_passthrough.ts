import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableMap } from "@langchain/core/runnables";

const prompt = ChatPromptTemplate.fromTemplate(`
Answer the question using the context below.

Context:
{context}

Question:
{question}
`);

const mappedInput = RunnableMap.from({
    question: async (input: { question: string }) => input.question,

    context: async () => {
        return "Employees receive 20 days of paid annual leave.";
    }
});

const promptResult = await prompt.invoke(
    await mappedInput.invoke({
        question: "How many vacation days do employees get?"
    })
);

console.log(promptResult);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0
});

const parser = new StringOutputParser();

const chain = mappedInput
    .pipe(prompt)
    .pipe(model)
    .pipe(parser);

const response = await chain.invoke({
    question: "How many vacation days do employees get?"
});

console.log(response);