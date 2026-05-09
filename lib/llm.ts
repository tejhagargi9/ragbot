import { ChatOpenAI } from "@langchain/openai";

export const chatModel = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});