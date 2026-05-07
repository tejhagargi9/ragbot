import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/document";

export async function splitDocuments(docs: Document[]) {
  if (!docs || docs.length === 0) {
    console.log('No documents to split');
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const allSplits = await splitter.splitDocuments(docs);
  console.log(`Split blog post into ${allSplits.length} sub-documents.`);

  // Filter out any chunks with empty content
  const validSplits = allSplits.filter(doc => doc.pageContent && doc.pageContent.trim().length > 0);
  console.log(`Valid splits after filtering: ${validSplits.length}`);

  return validSplits;
}