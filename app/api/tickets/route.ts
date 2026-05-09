import { NextRequest, NextResponse } from "next/server";
import { admin, db } from "../../../lib/firebaseAdmin";

interface Ticket {
  id: string;
  email: string;
  subject: string;
  issue: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "closed";
  createdAt: string;
  category: string;
}

export async function GET(req: NextRequest) {
  try {
    // Get session token from cookies
    const cookies = req.cookies;
    const sessionToken = cookies.get('session')?.value;

    if (!sessionToken) {
      console.error("[Tickets API] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Tickets API] Verifying session token...");

    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(sessionToken);
    const userEmail = decodedToken.email;

    if (!userEmail) {
      console.error("[Tickets API] Invalid token - no email");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log(`[Tickets API] Fetching tickets for authenticated user: ${userEmail}`);

    // Fetch all tickets from all users
    const querySnapshot = await db.collection('clients').get();
    const allTickets: Ticket[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tickets && Array.isArray(data.tickets)) {
        allTickets.push(...data.tickets);
      }
    });

    console.log(`[Tickets API] Retrieved ${allTickets.length} tickets total`);

    return NextResponse.json({ tickets: allTickets });
  } catch (error) {
    console.error("Error in tickets API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}