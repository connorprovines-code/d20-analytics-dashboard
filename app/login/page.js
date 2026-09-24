import { login } from './actions';

export const metadata = { title: 'Sign in | D20 Loot Tracker Analytics' };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const failed = params?.error === '1';
  return (
    <div className="container login-box">
      <h1>D20 Loot Tracker Analytics</h1>
      <p className="subtitle">Enter the dashboard password to continue.</p>
      <form action={login} className="login-form">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {failed && <p className="login-error" role="alert">Incorrect password.</p>}
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}
