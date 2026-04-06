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
      id: 'credentials-user',
      name: 'Phone/Password',
      credentials: {
        phoneNumber: { label: "Phone Number", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          console.log('[NextAuth.Credentials] User login with phone:', credentials.phoneNumber);
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
          console.log('[NextAuth.Credentials] Login successful, userId:', data.user.id);
          
          return {
            id: String(data.user.id),
            email: data.user.email || data.user.phone,
            name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() || data.user.username,
            phone: data.user.phone,
            role: data.user.role,
            staff_type: data.user.staff_type,
            is_staff: data.user.is_staff,
            is_superuser: data.user.is_superuser,
            token: data.token,
          };
        } catch (error: any) {
          console.error('[NextAuth.Credentials] Error:', error.message);
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),
    CredentialsProvider({
      id: 'credentials-admin',
      name: 'Admin Credentials',
      credentials: {
        phone: { label: "Phone Number", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          console.log('[NextAuth.Credentials.Admin] Admin login with phone:', credentials.phone);
          const res = await fetch(`${API_BASE}/users/admin/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: credentials.phone,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.detail || 'Invalid credentials');
          }

          const data = await res.json();
          console.log('[NextAuth.Credentials.Admin] Login successful, userId:', data.user.id);
          
          return {
            id: String(data.user.id),
            email: data.user.email || data.user.phone,
            name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() || data.user.username,
            phone: data.user.phone,
            role: data.user.role,
            staff_type: data.user.staff_type,
            is_staff: data.user.is_staff,
            is_superuser: data.user.is_superuser,
            token: data.token,
          };
        } catch (error: any) {
          console.error('[NextAuth.Credentials.Admin] Error:', error.message);
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),
    CredentialsProvider({
      id: 'credentials-rider',
      name: 'Rider Credentials',
      credentials: {
        phone: { label: "Phone Number", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          console.log('[NextAuth.Credentials.Rider] Rider login with phone:', credentials.phone);
          const res = await fetch(`${API_BASE}/users/rider/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: credentials.phone,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.detail || 'Invalid credentials');
          }

          const data = await res.json();
          console.log('[NextAuth.Credentials.Rider] Login successful, userId:', data.user.id);
          
          return {
            id: String(data.user.id),
            email: data.user.email || data.user.phone,
            name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() || data.user.username,
            phone: data.user.phone,
            role: data.user.role,
            staff_type: data.user.staff_type,
            is_staff: data.user.is_staff,
            is_superuser: data.user.is_superuser,
            token: data.token,
          };
        } catch (error: any) {
          console.error('[NextAuth.Credentials.Rider] Error:', error.message);
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
          console.log('[NextAuth.signIn] Google OAuth detected, email:', profile.email);
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
            const errorData = await res.json();
            console.error('[NextAuth.signIn] Google OAuth backend error:', errorData);
            return false;
          }

          const data = await res.json();
          console.log('[NextAuth.signIn] Google OAuth successful, userId:', data.user.id, 'token:', data.token.substring(0, 20) + '...');
          
          user.id = String(data.user.id);
          (user as any).phone = data.user.phone;
          (user as any).role = data.user.role;
          (user as any).token = data.token;
          (user as any).staff_type = data.user.staff_type;
          (user as any).is_staff = data.user.is_staff;
          (user as any).is_superuser = data.user.is_superuser;
          
          return true;
        } catch (error) {
          console.error('[NextAuth.signIn] Google OAuth error:', error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        console.log('[NextAuth.jwt] New user login, setting token data:', { userId: user.id, role: (user as any).role });
        token.id = user.id;
        (token as any).phone = (user as any).phone;
        (token as any).role = (user as any).role;
        (token as any).token = (user as any).token;
        (token as any).staff_type = (user as any).staff_type;
        (token as any).is_staff = (user as any).is_staff;
        (token as any).is_superuser = (user as any).is_superuser;
        (token as any).iat = Math.floor(Date.now() / 1000);  // Token creation time
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).phone = (token as any).phone;
        (session.user as any).role = (token as any).role;
        (session.user as any).token = (token as any).token;
        (session.user as any).staff_type = (token as any).staff_type;
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,    // Refresh token if unused for 1 day
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,  // 30 days
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('[NextAuth.events.signIn] User signed in:', {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
      });
    },
    async signOut({ token }) {
      console.log('[NextAuth.events.signOut] User signed out, userId:', token.id);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
