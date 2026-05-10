"use client";

import { useState, useRef, useEffect } from "react";

// Typing bubble component — three animated dots like MS Teams
function TypingBubble() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "180ms", animationDuration: "1s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "360ms", animationDuration: "1s" }}
          />
        </div>
      </div>
    </div>
  );
}

// Individual chat message
interface ChatMessageProps {
  message: {
    id: number;
    role: "user" | "assistant";
    content: string;
    time: string;
  };
}

type ChatMessageType = ChatMessageProps['message'];

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-2 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{
        animation: "fadeSlideIn 0.25s ease-out both",
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
      )}

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
        }`}
      >
        {message.content}
        <div
          className={`text-[10px] mt-1 ${isUser ? "text-blue-200 text-right" : "text-slate-400"}`}
        >
          {message.time}
        </div>
      </div>
    </div>
  );
}

const INITIAL_MESSAGES: ChatMessageType[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I'm your Ticket Support Agent. Please select a file from the dropdown above to start chatting about it.",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [files, setFiles] = useState<{ fileName: string; namespace: string }[]>([]);
  const [currentNamespace, setCurrentNamespace] = useState<string>("");
  const [showPopup, setShowPopup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch files on load
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/files');
        if (response.ok) {
          const data = await response.json();
          setFiles(data.files);
        } else {
          console.error('Failed to fetch files');
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };
    fetchFiles();
  }, []);

  // Load saved namespace
  useEffect(() => {
    const saved = localStorage.getItem('currentNamespace');
    if (saved && files.some(f => f.namespace === saved)) {
      setCurrentNamespace(saved);
    }
  }, [files]);

  // Auto-scroll to bottom on new message or typing indicator
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping || !currentNamespace) return;

    console.log(`[Chat Component] Sending message: ${text.substring(0, 100)}...`);

    const userMsg: ChatMessageType = {
      id: Date.now(),
      role: "user" as const,
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          currentNamespace,
        }),
      });

      console.log(`[Chat Component] API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let replyText =
        data?.content?.find((b: { type: string; text: string }) => b.type === "text")?.text ||
        "Sorry, I couldn't process that. Please try again.";

      console.log(`[Chat Component] Received reply: ${replyText.substring(0, 100)}...`);

      // Format ticket responses nicely
      try {
        const parsed = JSON.parse(replyText);
        if (parsed.id && typeof parsed.id === 'string' && parsed.id.startsWith('TKT-')) {
          replyText = `🎫 **Ticket Created!**\n\n**ID:** ${parsed.id}\n**Subject:** ${parsed.subject}\n**Issue:** ${parsed.issue}\n**Priority:** ${parsed.priority}\n**Status:** ${parsed.status}\n**Category:** ${parsed.category}\n**Created:** ${new Date(parsed.createdAt).toLocaleString()}`;
        }
      } catch (e) {
        // Not a ticket JSON, use as is
      }

      const assistantMsg: ChatMessageType = {
        id: Date.now() + 1,
        role: "assistant",
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("[Chat Component] Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant" as const,
          content: "Something went wrong. Please try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex flex-col h-screen bg-[#f0f4fa] font-sans">
        {/* ── Navbar ── */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800 tracking-tight">
              Ticket Support Agent
            </span>
            <select
              value={currentNamespace}
              onChange={(e) => {
                setCurrentNamespace(e.target.value);
                localStorage.setItem('currentNamespace', e.target.value);
              }}
              className="px-3 py-1.5 text-sm text-black border border-black rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a file</option>
              {files.map((file) => (
                <option key={file.namespace} value={file.namespace}>
                  {file.fileName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Online pill */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
            <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* ── Messages ── */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-24 xl:px-40">
          <div className="max-w-3xl mx-auto">
            {/* Date divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-slate-300" />
              <span className="text-xs text-slate-400 font-medium">Today</span>
              <div className="flex-1 h-px bg-slate-300" />
            </div>

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {isTyping && <TypingBubble />}

            <div ref={bottomRef} />
          </div>
        </main>

        {/* ── Input bar ── */}
        <footer className="bg-white border-t border-slate-200 px-4 py-3 md:px-8 lg:px-24 xl:px-40 flex-shrink-0">
          {showPopup && (
            <div className="mb-2 text-center">
              <div className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200">
                Please select a file first to interact with.
              </div>
            </div>
          )}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
              {/* Attachment button */}
              <button className="text-slate-400 hover:text-blue-500 transition-colors mb-1 flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (e.target.value && !currentNamespace) {
                    setShowPopup(true);
                    setTimeout(() => setShowPopup(false), 3000);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message… (Enter to send)"
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm text-slate-800 placeholder-slate-400 outline-none py-1 max-h-36 leading-relaxed"
                style={{ scrollbarWidth: "none" }}
                onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 144) + "px";
                }}
              />

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping || !currentNamespace}
                className={`mb-1 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !isTyping && currentNamespace
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-blue-200 hover:scale-105 active:scale-95"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-2">
              Press <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> to send ·{" "}
              <kbd className="font-mono bg-slate-100 px-1 rounded">Shift + Enter</kbd> for new line
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}