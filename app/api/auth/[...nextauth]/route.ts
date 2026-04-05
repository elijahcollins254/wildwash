import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phoneNumber: { label: "Phone Number", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          const res = await fetch(`${API_BASE}/users/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: credentials.phoneNumber,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.detail || 'Invalid credentials');
          }

          const data = await res.json();
          return {
            id: String(data.user.id),
            email: data.user.email || data.user.phone,
            name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() || data.user.username,
            phone: data.user.phone,
            role: data.user.role,
            token: data.token,
          };
        } catch (error: any) {
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth login
      if (account?.provider === 'google' && profile) {
        try {
          const res = await fetch(`${API_BASE}/users/google-auth/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
              google_id: profile.sub,
            }),
          });

          if (!res.ok) {
            console.error('Google OAuth backend error:', await res.json());
            return false;
          }

          const data = await res.json();
          user.id = String(data.user.id);
          user.phone = data.user.phone;
          user.role = data.user.role;
          (user as any).token = data.token;
          (user as any).staff_type = data.user.staff_type;
          
          return true;
        } catch (error) {
          console.error('Google OAuth error:', error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone;
        token.role = (user as any).role;
        token.token = (user as any).token;
        token.staff_type = (user as any).staff_type;
        token.is_staff = (user as any).is_staff;
        token.is_superuser = (user as any).is_superuser;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).phone = token.phone;
        (session.user as any).role = token.role;
        (session.user as any).token = token.token;
        (session.user as any).staff_type = token.staff_type;
        (session.user as any).is_staff = (token as any).is_staff;
        (session.user as any).is_superuser = (token as any).is_superuser;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
