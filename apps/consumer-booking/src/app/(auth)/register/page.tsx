'use client';

/**
 * /register — Consumer self-registration
 *
 * Calls POST /api/v1/consumer/register (identity-service).
 * On success: signs in via NextAuth and optionally links guest bookings.
 *
 * Pre-fills email from ?email= query param (set by guest confirmation CTA).
 */

import { useState }              from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link                      from 'next/link';
import { signIn }                from 'next-auth/react';
import { useMutation }           from '@tanstack/react-query';
import { cn }                    from '@/lib/utils/cn';
import { registerConsumer }      from '@/lib/api/guest.api';

const inp = (err?: string) => cn(
  'block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors',
  err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
);

export default function RegisterPage(): React.ReactElement {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get('callbackUrl') ?? '/';
  const emailPrefill = searchParams.get('email') ?? '';

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState(emailPrefill);
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => registerConsumer({ name: name.trim(), email: email.trim(), password }),
    onSuccess:  async () => {
      // Sign in after registration
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setErrors({ form: 'Account created but sign-in failed. Please log in.' });
        router.push('/login');
      } else {
        router.push(callbackUrl);
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Registration failed. Please try again.';
      setErrors({ form: msg });
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim())                                       e['name']     = 'Name is required';
    if (!email.trim())                                      e['email']    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))    e['email']    = 'Enter a valid email';
    if (password.length < 8)                               e['password'] = 'At least 8 characters';
    if (password !== confirm)                              e['confirm']  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
        <p className="text-sm text-gray-500 mt-1">Book and manage courts in one place</p>
      </div>

      {errors['form'] && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors['form']}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="reg-name" className="block text-xs font-medium text-gray-700">Full name</label>
        <input id="reg-name" type="text" autoComplete="name" required value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Your name"
          className={inp(errors['name'])} />
        {errors['name'] && <p className="text-xs text-red-600">{errors['name']}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-email" className="block text-xs font-medium text-gray-700">Email address</label>
        <input id="reg-email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className={inp(errors['email'])} />
        {errors['email'] && <p className="text-xs text-red-600">{errors['email']}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-password" className="block text-xs font-medium text-gray-700">Password</label>
        <input id="reg-password" type="password" autoComplete="new-password" required minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className={inp(errors['password'])} />
        {errors['password'] && <p className="text-xs text-red-600">{errors['password']}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-confirm" className="block text-xs font-medium text-gray-700">Confirm password</label>
        <input id="reg-confirm" type="password" autoComplete="new-password" required
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          className={inp(errors['confirm'])} />
        {errors['confirm'] && <p className="text-xs text-red-600">{errors['confirm']}</p>}
      </div>

      <button type="submit" disabled={mutation.isPending}
        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
        aria-busy={mutation.isPending}>
        {mutation.isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
