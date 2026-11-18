import { writeFile } from "node:fs/promises";

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

const values = {
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleClientId,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || googleClientId,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

const missingVariables = Object.entries(values)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length > 0) {
  console.error(
    `Missing required Amplify environment variables: ${missingVariables.join(", ")}`,
  );
  process.exit(1);
}

const envFile = Object.entries(values)
  .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
  .join("\n");

await writeFile(".env.production", `${envFile}\n`, { mode: 0o600 });
console.log("Wrote .env.production for the Next.js Amplify build.");
