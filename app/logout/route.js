import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../lib/auth';

export async function GET(request) {
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
