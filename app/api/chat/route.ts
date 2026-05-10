import { NextRequest, NextResponse } from "next/server";
import { getContext } from "../../../lib/rag";
import { admin, db } from "../../../lib/firebaseAdmin";
import { chatModel } from "../../../lib/llm";

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
    console.log(`[Chat API] Calling getContext with namespace: ${currentNamespace} and userMessage: ${userMessage.substring(0, 100)}...`);

    const { contextSystemMsg } = await getContext(userMessage, currentNamespace);

    console.log("[Chat API] Calling OpenAI LLM...");

    const allMessages = [
      { role: "system", content: contextSystemMsg.content },
      ...messages
    ];

    const llmResponse = await chatModel.invoke(allMessages);
    let replyText = llmResponse.content as string;

    console.log(`[Chat API] LLM response length: ${replyText.length}`);

    // If response is a ticket JSON, set accurate createdAt and store in Firestore
    try {
      const parsed = JSON.parse(replyText);
      if (parsed.id && typeof parsed.id === 'string' && parsed.id.startsWith('TKT-')) {
        parsed.createdAt = new Date().toISOString();
        parsed.email = userEmail; // Add email to ticket

        // Store ticket in user's Firestore document
        const userRef = db.collection('clients').doc(userEmail);
        await userRef.update({
          tickets: admin.firestore.FieldValue.arrayUnion(parsed)
        });

        console.log(`[Chat API] Stored ticket ${parsed.id} for user: ${userEmail}`);
        console.log("[Chat API] Updated ticket createdAt timestamp");

        replyText = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Not JSON, use as is
    }

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