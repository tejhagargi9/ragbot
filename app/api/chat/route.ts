import { NextRequest, NextResponse } from "next/server";
import { cragGraph } from "../../../lib/crag";
import { HumanMessage } from "@langchain/core/messages";
import { admin, db } from "../../../lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentNamespace } = await req.json();

    console.log(`[Chat API] Received messages: ${messages.length} messages`);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[Chat API] Missing or invalid messages");
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    if (!currentNamespace) {
      console.error("[Chat API] Missing currentNamespace");
      return NextResponse.json({ error: "Missing currentNamespace" }, { status: 400 });
    }

    // Get session token from cookies
    const cookies = req.cookies;
    const sessionToken = cookies.get('session')?.value;

    if (!sessionToken) {
      console.error("[Chat API] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Chat API] Verifying session token...");

    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(sessionToken);
    const userEmail = decodedToken.email;

    if (!userEmail) {
      console.error("[Chat API] Invalid token - no email");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }



    const userMessage = messages[messages.length - 1].content;
    console.log(`[Chat API] Calling CRAG with namespace: ${currentNamespace}`);

    const result = await cragGraph.invoke({
      question: userMessage,
      namespace: currentNamespace,
      messages: [new HumanMessage(userMessage)],
    });
    let replyText = result.answer || "";

    console.log(`[Chat API] LLM response length: ${replyText.length}`);

    // Normalize response to match Anthropic format for client compatibility
    const data = {
      content: [{ type: "text", text: replyText }]
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}