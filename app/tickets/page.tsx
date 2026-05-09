"use client";

import { useState, useEffect } from "react";

type Priority = "critical" | "high" | "medium" | "low";
type Status = "open" | "in-progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  email: string;
  subject: string;
  issue: string;
  priority: Priority;
  status: Status;
  createdAt: string;
  category: string;
}



const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; badge: string }> = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
  medium: {
    label: "Medium",
    dot: "bg-yellow-500",
    badge: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
};

const STATUS_CONFIG: Record<Status, { label: string; style: string }> = {
  open: { label: "Open", style: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  "in-progress": { label: "In Progress", style: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
  resolved: { label: "Resolved", style: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  closed: { label: "Closed", style: "bg-slate-100 text-slate-500 ring-1 ring-slate-200" },
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const [expanded, setExpanded] = useState(false);
  const p = PRIORITY_CONFIG[ticket.priority];
  const s = STATUS_CONFIG[ticket.status];

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Top accent bar by priority */}
      <div
        className={`h-1 w-full ${
          ticket.priority === "critical"
            ? "bg-gradient-to-r from-red-500 to-rose-400"
            : ticket.priority === "high"
            ? "bg-gradient-to-r from-orange-400 to-amber-400"
            : ticket.priority === "medium"
            ? "bg-gradient-to-r from-yellow-400 to-lime-400"
            : "bg-gradient-to-r from-emerald-400 to-teal-400"
        }`}
      />

      <div className="flex flex-col gap-3 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              {ticket.id}
            </span>
            <span className="text-xs text-slate-400">{timeAgo(ticket.createdAt)}</span>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.style}`}>
            {s.label}
          </span>
        </div>

        {/* Subject */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {ticket.subject}
        </h3>

        {/* Email */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold uppercase">
            {ticket.email[0]}
          </div>
          <a
            href={`mailto:${ticket.email}`}
            className="text-xs text-indigo-600 hover:text-indigo-800 truncate font-medium transition-colors"
          >
            {ticket.email}
          </a>
        </div>

        {/* Issue preview / expand */}
        <div>
          <p
            className={`text-xs text-slate-500 leading-relaxed ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {ticket.issue}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            {ticket.category}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${p.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
            {p.label}
          </span>
        </div>
      </div>
    </div>
  );
}

const ALL_STATUSES: Status[] = ["open", "in-progress", "resolved", "closed"];
const ALL_PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/tickets');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setTickets(data.tickets || []);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.email.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.issue.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    "in-progress": tickets.filter((t) => t.status === "in-progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-none">Support Tickets</h1>
            <p className="text-xs text-slate-400 mt-0.5">{tickets.length} total tickets</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["open", "in-progress", "resolved", "closed"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                statusFilter === s
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
              }`}
            >
              <p className={`text-2xl font-bold ${statusFilter === s ? "text-white" : "text-slate-800"}`}>
                {counts[s]}
              </p>
              <p className={`text-xs mt-0.5 capitalize ${statusFilter === s ? "text-indigo-200" : "text-slate-400"}`}>
                {STATUS_CONFIG[s].label}
              </p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              placeholder="Search by email, subject, or ticket ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
            className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-600 min-w-36"
          >
            <option value="all">All Priorities</option>
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="text-sm text-slate-500">Loading tickets...</div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">No tickets found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  );
}