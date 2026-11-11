import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Sign-in error</h1>
        <p className="mt-3 text-gray-600">
          We couldn&apos;t complete your sign-in. Please try again.
        </p>
        <Link className="mt-6 inline-block underline" href="/login">
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
