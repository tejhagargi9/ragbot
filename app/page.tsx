"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { logout } from "../lib/auth";
import { useRouter } from "next/navigation";

export default function PDFUploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedText, setParsedText] = useState<string | null>(null);
  const [parsedChunks, setParsedChunks] = useState<Array<{
    chunkIndex: number;
    content: string;
    tags: string[];
    metadata: {
      pageNumber: number;
      totalPages: number;
      documentId: string;
    };
  }>>([]);
  const [documentTags, setDocumentTags] = useState<string[]>([]);
  const [embeddingsInfo, setEmbeddingsInfo] = useState<{
    generated: boolean;
    model: string;
    dimensions: number;
  } | null>(null);
  const [vectorStorageInfo, setVectorStorageInfo] = useState<{
    stored: boolean;
    indexName: string;
    documentsStored: number;
  } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();


  const uploadToAPI = useCallback(async (file: File) => {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }

      const result = await response.json();
      console.log('PDF parsing complete');
      console.log('Total pages:', result.totalPages);
      console.log('Total chunks:', result.totalChunks);
      console.log('Full text length:', result.fullText?.length);
      console.log('Chunks sample:', result.chunks?.slice(0, 3));
      setParsedText(result.fullText);
      setParsedChunks(result.chunks);
      setDocumentTags(result.tags);
      setEmbeddingsInfo({
        generated: result.embeddingsGenerated,
        model: result.embeddingModel,
        dimensions: result.embeddingDimensions
      });
      if (result.vectorStorage) {
        setVectorStorageInfo(result.vectorStorage);
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Failed to parse PDF. Please try again.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }
    setIsLoading(true);
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setTimeout(() => {
      setPdfUrl(url);
      setIsLoading(false);
    }, 600);

    // Also upload to API for parsing
    await uploadToAPI(file);
  }, [uploadToAPI]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setPdfUrl(null);
    setParsedText(null);
    setParsedChunks([]);
    setDocumentTags([]);
    setEmbeddingsInfo(null);
    setVectorStorageInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChat = () => {
      router.push('/chat');

  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="w-full border-b border-blue-100 bg-white/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-blue-900">Ticket Support Agent</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleChat}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col items-center gap-10">
        {/* Hero Text */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-900 tracking-tight leading-tight mb-3">
            Upload your <span className="text-blue-500">PDF file</span>
          </h1>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Drag & drop or browse to upload a PDF. It will appear right here for instant preview.
            </p>
        </div>

        {/* Upload Zone */}
        {!pdfUrl && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              w-full max-w-2xl mx-auto relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
              flex flex-col items-center justify-center gap-5 px-8 py-16
              ${isDragging
                ? "border-blue-500 bg-blue-50 scale-[1.01] shadow-xl shadow-blue-100"
                : "border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/60 hover:shadow-lg hover:shadow-blue-100"
              }
            `}
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? "bg-blue-100" : "bg-blue-50"}`}>
              <svg
                className={`w-9 h-9 transition-colors duration-300 ${isDragging ? "text-blue-600" : "text-blue-400"}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <div className="text-center space-y-1">
              <p className="text-blue-900 font-semibold text-xl">
                {isDragging ? "Release to upload" : "Drop your PDF here"}
              </p>
              <p className="text-slate-400 text-sm">or click to browse files</p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Browse PDF File
            </div>

            <p className="text-xs text-slate-300">Only .pdf files are supported</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
            <p className="text-blue-400 text-sm font-medium">Loading your PDF…</p>
          </div>
        )}

        {/* File Info Bar */}
        {uploadedFile && pdfUrl && (
          <div className="w-full max-w-4xl flex items-center gap-4 px-5 py-3.5 bg-white border border-blue-100 rounded-xl shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-blue-900 font-semibold text-sm truncate">{uploadedFile.name}</p>
              <p className="text-slate-400 text-xs">{(uploadedFile.size / 1024).toFixed(1)} KB · PDF Document</p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
        )}

        {/* PDF Viewer */}
        {pdfUrl && !isLoading && (
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-blue-100 shadow-2xl shadow-blue-100/50 bg-white">
            {/* Viewer toolbar */}
            <div className="flex items-center gap-3 px-5 py-3 bg-blue-600 border-b border-blue-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-400/60" />
                <div className="w-3 h-3 rounded-full bg-blue-400/60" />
                <div className="w-3 h-3 rounded-full bg-blue-400/60" />
              </div>
              <span className="text-blue-100 text-xs font-medium truncate flex-1 text-center pr-12">
                {uploadedFile?.name}
              </span>
            </div>
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="w-full"
              style={{ height: "78vh", minHeight: "500px" }}
            />
          </div>
        )}

        {/* Document Tags */}
        {documentTags.length > 0 && (
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-semibold text-blue-900 mb-4">Document Tags</h2>
            <div className="flex flex-wrap gap-2">
              {documentTags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Embeddings Info */}
        {embeddingsInfo && (
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-semibold text-blue-900 mb-4">Embeddings Generated</h2>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-800 font-medium">Embeddings Generated Successfully</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p><span className="font-medium">Model:</span> {embeddingsInfo.model}</p>
                <p><span className="font-medium">Dimensions:</span> {embeddingsInfo.dimensions}</p>
                <p><span className="font-medium">Chunks Embedded:</span> {parsedChunks.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Vector Storage Info */}
        {vectorStorageInfo && (
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-semibold text-blue-900 mb-4">Vector Storage</h2>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-purple-800 font-medium">Vectors Stored in Pinecone</span>
              </div>
              <div className="text-sm text-purple-700 space-y-1">
                <p><span className="font-medium">Index:</span> {vectorStorageInfo.indexName}</p>
                <p><span className="font-medium">Documents Stored:</span> {vectorStorageInfo.documentsStored}</p>
                <p><span className="font-medium">Ready for Search:</span> Yes</p>
              </div>
            </div>
          </div>
        )}

        {/* Tagged Chunks */}
        {parsedChunks.length > 0 && (
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-semibold text-blue-900 mb-4">Tagged Content Chunks</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {parsedChunks.map((chunk, index) => (
                <div key={index} className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600">
                    Chunk {chunk.chunkIndex + 1} (Page {chunk.metadata.pageNumber})
                  </span>
                    <div className="flex flex-wrap gap-1">
                      {chunk.tags.map((tag: string, tagIndex: number) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Parsed Text */}
        {parsedText && (
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-semibold text-blue-900 mb-4">Full Extracted Text</h2>
            <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-lg">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed max-h-96 overflow-y-auto">
                {parsedText}
              </pre>
            </div>
          </div>
        )}

        {/* Parsing Status */}
        {isParsing && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-8 h-8 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
            <p className="text-blue-400 text-sm font-medium">Parsing PDF content…</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-slate-300">
        PDFViewer · Built with Next.js & Tailwind CSS
      </footer>
    </main>
  );
}
