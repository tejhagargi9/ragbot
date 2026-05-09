import { NextRequest, NextResponse } from "next/server";
import { getContext } from "../../../lib/rag";
import { admin, db } from "../../../lib/firebaseAdmin";
import { chatModel } from "../../../lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    console.log(`[Chat API] Received messages: ${messages.length} messages`);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[Chat API] Missing or invalid messages");
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
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

    console.log(`[Chat API] Fetching namespace for user: ${userEmail}`);

    // Get user namespace from Firestore
    const userDoc = await db.collection('clients').doc(userEmail).get();
    if (!userDoc.exists) {
      console.error(`[Chat API] User document not found for: ${userEmail}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const namespaces = userData?.namespaces;
    if (!namespaces || !Array.isArray(namespaces) || namespaces.length === 0) {
      console.error(`[Chat API] No namespaces found for user: ${userEmail}`);
      return NextResponse.json({ error: "No namespaces found for user" }, { status: 400 });
    }

    const namespace = namespaces[0];
    console.log(`[Chat API] Retrieved namespace: ${namespace} for user: ${userEmail}`);

    const userMessage = messages[messages.length - 1].content;
    console.log(`[Chat API] Calling getContext with namespace: ${namespace} and userMessage: ${userMessage.substring(0, 100)}...`);

    const { contextSystemMsg } = await getContext(userMessage, namespace);

    console.log("[Chat API] Calling OpenAI LLM...");

    const allMessages = [
      { role: "system", content: contextSystemMsg.content },
      ...messages
    ];

    const llmResponse = await chatModel.invoke(allMessages);
    const replyText = llmResponse.content as string;

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