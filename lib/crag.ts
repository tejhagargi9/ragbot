import {
  StateGraph,
  Annotation,
  MessagesAnnotation,
  END,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PineconeStore } from "@langchain/pinecone";
import { TavilySearch } from "@langchain/tavily";
import { embeddings } from "./embeddings";
import { promptTemplate } from "./ragPrompt";

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const tavilyTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

let vectorStore: PineconeStore | null = null;

async function getVectorStore() {
  console.log("[CRAG] getVectorStore called, cached:", !!vectorStore);
  if (!vectorStore) {
    const { pineconeIndex } = await import("./pinecone");
    vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
    });
    console.log("[CRAG] vectorStore initialized");
  }
  return vectorStore;
}

const CRAGState = Annotation.Root({
  ...MessagesAnnotation.spec,
  question: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  namespace: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  documents: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  retrievalGrade: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  rewrittenQuestion: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  answer: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  retryCount: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
});

async function retrieve(state: typeof CRAGState.State) {
  console.log("[CRAG] retrieve node started");
  const store = await getVectorStore();
  const query = state.rewrittenQuestion || state.question;
  console.log("[CRAG] retrieve query:", query, "namespace:", state.namespace);
  const results = await store.similaritySearch(query, 5, {
    namespace: state.namespace,
  });
  const docs = results.map((doc) => doc.pageContent);
  console.log("[CRAG] retrieve got", docs.length, "docs");
  return { documents: docs };
}

async function gradeDocuments(state: typeof CRAGState.State) {
  console.log("[CRAG] LLM grading retrieval...");

  const context = state.documents.join("\n\n");

  const response = await model.invoke([
    new SystemMessage(`
You are a retrieval evaluator.

Determine whether the retrieved documents
are relevant enough to answer the user's question.

Reply ONLY with:
- good
- bad
`),

    new HumanMessage(`
Question:
${state.question}

Retrieved Documents:
${context}
`),
  ]);

  const grade =
    typeof response.content === "string"
      ? response.content.toLowerCase().trim()
      : "bad";

  console.log("[CRAG] LLM grade:", grade);

  return {
    retrievalGrade: grade,
  };
} 

async function rewriteQuery(state: typeof CRAGState.State) {
  console.log("[CRAG] rewriteQuery node started");
  const response = await model.invoke([
    new SystemMessage("Rewrite the user's query to improve vector retrieval."),
    new HumanMessage(state.question),
  ]);
  const rewritten =
    typeof response.content === "string" ? response.content : state.question;
  console.log("[CRAG] rewriteQuery new query:", rewritten);
  return { rewrittenQuestion: rewritten, retryCount: state.retryCount + 1 };
}

async function webFallback(state: typeof CRAGState.State) {
  console.log("[CRAG] webFallback node started - using Tavily");
  const results = await tavilyTool.invoke({ query: state.question });
  const docs = Array.isArray(results)
    ? results.map((r: any) => r.content || JSON.stringify(r))
    : [typeof results === "string" ? results : JSON.stringify(results)];
  console.log("[CRAG] webFallback got", docs.length, "web results");
  return { documents: docs, retrievalGrade: "good" };
}

async function generateAnswer(state: typeof CRAGState.State) {
  console.log("[CRAG] generateAnswer node started");
  const combinedContext = state.documents.join("\n\n");
  const formattedPrompt = await promptTemplate.format({
    context: combinedContext,
  });
  const response = await model.invoke([
    new SystemMessage(formattedPrompt),
    new HumanMessage(state.question),
  ]);
  const answer = typeof response.content === "string" ? response.content : "";
  console.log("[CRAG] generateAnswer produced answer length:", answer.length);
  return { answer, messages: [response] };
}

function shouldRetry(state: typeof CRAGState.State) {
  console.log(
    "[CRAG] shouldRetry grade:",
    state.retrievalGrade,
    "retryCount:",
    state.retryCount,
  );
  if (state.retryCount >= 2) {
    return state.retrievalGrade === "bad" ? "web_fallback" : "generate";
  }
  if (state.retrievalGrade === "bad") return "rewrite_query";
  return "generate";
}

console.log("[CRAG] Graph compiled");
export const cragGraph = new StateGraph(CRAGState)
  .addNode("retrieve", retrieve)
  .addNode("grade_documents", gradeDocuments)
  .addNode("rewrite_query", rewriteQuery)
  .addNode("web_fallback", webFallback)
  .addNode("generate", generateAnswer)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "grade_documents")
  .addConditionalEdges("grade_documents", shouldRetry, {
    rewrite_query: "rewrite_query",
    web_fallback: "web_fallback",
    generate: "generate",
  })
  .addEdge("rewrite_query", "retrieve")
  .addEdge("web_fallback", "generate")
  .addEdge("generate", END)
  .compile();
