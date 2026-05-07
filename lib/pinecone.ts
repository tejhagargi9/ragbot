import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const pineconeIndex = pinecone.Index(
  process.env.PINECONE_INDEX_NAME || "pdf-documents"
);

export function getPineconeIndex() {
  return pineconeIndex;
}

export function getNamespacedIndex(namespace: string) {
  return pineconeIndex.namespace(namespace);
}

export async function listPineconeIndexes() {
  return pinecone.listIndexes();
}