'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, passwordMatches } from '../../lib/auth';

export async function login(formData) {
  const password = formData.get('password');
  if (!(await passwordMatches(typeof password === 'string' ? password : ''))) {
    // Small fixed delay slows down guessing without adding state.
    await new Promise((r) => setTimeout(r, 600));
    redirect('/login?error=1');
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect('/');
}
