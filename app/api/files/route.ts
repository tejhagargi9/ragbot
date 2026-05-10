import { NextRequest, NextResponse } from "next/server";
import { admin, db } from "../../../lib/firebaseAdmin";

async function getUserEmailFromToken(request: NextRequest): Promise<string | null> {
  try {
    const cookies = request.cookies;
    const sessionToken = cookies.get('session')?.value;

    if (!sessionToken) {
      return null;
    }

    const decodedToken = await admin.auth().verifyIdToken(sessionToken);
    return decodedToken.email || null;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userDoc = await db.collection('clients').doc(userEmail).get();
    if (!userDoc.exists) {
      return NextResponse.json({ files: [] });
    }

    const userData = userDoc.data();
    const namespaces = userData?.namespaces || [];
    const files = namespaces.map((n: any) => ({ fileName: n.fileName, namespace: n.namespace }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}