import { cragGraph } from "./crag";
import { HumanMessage } from "@langchain/core/messages";

export async function getContext(userMessage: string, namespace: string) {
  try {
    const result = await cragGraph.invoke({
      question: userMessage,
      namespace,
      messages: [new HumanMessage(userMessage)],
    });
    const combinedContext = result.documents ? result.documents.join("\n\n") : "";
    const contextSystemMsg = { role: "system" as const, content: result.answer || "" };
    return { combinedContext, contextSystemMsg, pineconeFailed: false };
  } catch (error) {
    const contextSystemMsg = { role: "system" as const, content: "" };
    return { combinedContext: "", contextSystemMsg, pineconeFailed: true };
  }
}
