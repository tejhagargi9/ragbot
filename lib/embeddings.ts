import { OpenAIEmbeddings } from "@langchain/openai";

export const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-large",
  dimensions: 3072,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddingVectors = await embeddings.embedDocuments(texts);
    return embeddingVectors;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

export async function generateSingleEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingVector = await embeddings.embedQuery(text);
    return embeddingVector;
  } catch (error) {
    console.error('Error generating single embedding:', error);
    throw new Error('Failed to generate single embedding');
  }
}