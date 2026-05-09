import { PineconeStore } from "@langchain/pinecone";
import { embeddings } from "./embeddings";

const SYSTEM_PROMPT = "You are a helpful Ticket Support Agent. Respond in a professional tone. Do not hallucinate information. Base your responses on the provided context from the knowledge base. If no relevant context is provided, inform the user that you don't have sufficient resources to answer their question.";

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

