import { NextResponse } from "next/server";

// Clears the session cookie and redirects to the login page
export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set("apt_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // expire immediately
    path: "/",
  });
  return response;
}
