import { PineconeStore } from "@langchain/pinecone";
import { embeddings } from "./embeddings";

const SYSTEM_PROMPT = `You are a helpful Ticket Support Agent. Respond in a professional tone. Do not hallucinate information. Base your responses on the provided context from the knowledge base.

First, determine if the user's message is asking about or reporting an issue, problem, bug, error, or similar support ticket-worthy concern.

If the user is reporting/asking about an issue AND there is relevant context from the knowledge base about that issue:
- Respond with a JSON object in the following exact format:
{
  "id": "TKT-XXXX",
  "subject": "Brief subject line",
  "issue": "Detailed description of the issue",
  "priority": "critical|high|medium|low",
  "status": "open",
  "createdAt": "ISO timestamp",
  "category": "Bug|Feature|Question|Other"
}
- Generate a unique ID like TKT- followed by 4 random digits.
- Set createdAt to the current ISO timestamp.
- Determine priority based on issue severity (critical for system down, high for major functionality, etc.).
- Set status to "open".
- Choose appropriate category.
- Do NOT include an "email" field.

If the user is NOT reporting an issue, or if there is no relevant context, respond normally with helpful information from the knowledge base. If no relevant context is provided for general questions, inform the user that you don't have sufficient resources to answer their question.`;

let vectorStore: PineconeStore | null = null;

async function getVectorStore() {
  if (!vectorStore) {
    const { pineconeIndex } = await import("./pinecone");
    vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
    });
  }
  return vectorStore;
}

export async function getContext(userMessage: string, namespace: string) {
  try {
    const store = await getVectorStore();
    // Use the vector store to retrieve relevant context based on user message
    const results = await store.similaritySearch(userMessage, 1, {
      namespace: namespace,
    });
    console.log("Top 1 chunk (preview):", results.map((doc) => doc.pageContent.substring(0, 50) + "..."));

    if (results && results.length > 0) {
      const combinedContext = results.map((doc) => doc.pageContent).join('\n\n');
      const contextSystemMsg = {
        role: "system" as const,
        content: `Context from knowledge base:\n${combinedContext}\n\n${SYSTEM_PROMPT}`
      };
      return { combinedContext, contextSystemMsg, pineconeFailed: false };
    }
  } catch (error) {
    console.error(`[Pinecone Context] Failed to retrieve context for ${namespace}`, error);
    return { combinedContext: "", contextSystemMsg: { role: "system" as const, content: SYSTEM_PROMPT }, pineconeFailed: true };
  }
  // If no results
  return { combinedContext: "", contextSystemMsg: { role: "system" as const, content: SYSTEM_PROMPT }, pineconeFailed: false };
}

