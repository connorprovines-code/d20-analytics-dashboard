// Next 16 "proxy" (formerly middleware): every route except /login requires a valid session cookie.
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/auth';

export async function proxy(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const res = NextResponse.redirect(url);
  if (token) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  // Everything except the login page and Next's static assets.
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
