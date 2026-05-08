import { NextResponse } from "next/server";

import { PineconeStore } from "@langchain/pinecone";

export const runtime = 'nodejs';

import { embeddings } from "../../../lib/embeddings";
import { getPineconeIndex } from "../../../lib/pinecone";
import { loadPDF } from "../../../lib/pdfLoader";
import { splitDocuments } from "../../../lib/textSplitter";

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 20MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    fs.writeFileSync(tempFilePath, buffer);

    const docs = await loadPDF(tempFilePath);

    if (!docs.length) {
      return NextResponse.json({ error: "PDF contains no readable content" }, { status: 400 });
    }

    const splitDocs = await splitDocuments(docs);

    if (!splitDocs.length) {
      return NextResponse.json({ error: "No valid text chunks found" }, { status: 400 });
    }

    const namespace = crypto.createHash("sha256").update(file.name).digest("hex").slice(0, 32);

    const fullText = docs.map(doc => doc.pageContent).join('\n');

    const chunks = splitDocs.map((doc, index) => ({
      chunkIndex: index,
      content: doc.pageContent,
      tags: [],
      metadata: {
        pageNumber: doc.metadata.pageNumber || 0,
        totalPages: docs.length,
        documentId: namespace,
      },
    }));

    const tags: string[] = [];

    const documents = splitDocs.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        fileName: file.name,
        chunkId: index,
        uploadedAt: new Date().toISOString(),
      },
    }));

    const pineconeIndex = getPineconeIndex();

    // Test embedding generation with first document
    await embeddings.embedQuery(documents[0].pageContent);

    // Insert documents into Pinecone vector store
    console.log('Inserting documents into vector store...');
    await PineconeStore.fromDocuments(documents, embeddings, { pineconeIndex, namespace });
    console.log('Vector store insertion completed successfully');

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalPages: docs.length,
      totalChunks: documents.length,
      namespace,
      fullText,
      chunks,
      tags,
      embeddingsGenerated: true,
      embeddingModel: "text-embedding-3-large",
      embeddingDimensions: 3072,
      vectorStorage: {
        stored: true,
        indexName: process.env.PINECONE_INDEX_NAME || "pdf-documents",
        documentsStored: documents.length,
      },
    });

  } catch (error) {
    console.error("PDF processing error:", error);
    return NextResponse.json({ success: false, error: "Failed to process PDF" }, { status: 500 });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}