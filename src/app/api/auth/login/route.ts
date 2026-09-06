import { NextRequest, NextResponse } from "next/server";

// The shared password is stored exclusively in an environment variable —
// never hard-coded in source code.
const APP_PASSWORD = process.env.APP_PASSWORD;

export async function POST(request: NextRequest) {
  if (!APP_PASSWORD) {
    // Server misconfiguration — do not leak details to the client
    console.error("APP_PASSWORD environment variable is not set.");
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!body.password || body.password !== APP_PASSWORD) {
    // Use a fixed delay to limit brute-force attempts
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json(
      { message: "Incorrect password. Please try again." },
      { status: 401 }
    );
  }

  // Set a simple session cookie valid for 7 days
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set("apt_session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: "/",
  });

  return response;
}
