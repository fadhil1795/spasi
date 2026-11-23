import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'missing-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing-client-secret',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email/Username dan password wajib diisi');
        }

        const identifier = credentials.email.trim();

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { name: identifier },
            ],
          },
        });

        if (!user) {
          throw new Error('User tidak ditemukan');
        }

        if (user.isSuspended) {
          throw new Error('Akun Anda ditangguhkan. Silakan hubungi Administrator.');
        }

        const hash = (user.password || '').replace(/^\$2y\$/, '$2a$');
        let isPasswordValid = false;
        
        try {
          isPasswordValid = await bcrypt.compare(credentials.password, hash);
        } catch {
          isPasswordValid = false;
        }

        if (!isPasswordValid) {
          throw new Error('Password salah');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          renterCategory: user.renterCategory,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || 'Pengguna Google',
              password: '',
              role: 'BORROWER',
              avatarUrl: user.image,
            },
          });
        } else if (existingUser.isSuspended) {
          return false;
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.departmentId = dbUser.departmentId;
          token.renterCategory = dbUser.renterCategory;
        }
      } else if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.departmentId = (user as any).departmentId;
        token.renterCategory = (user as any).renterCategory;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).departmentId = token.departmentId;
        (session.user as any).renterCategory = token.renterCategory;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 jam
  },
  secret: process.env.NEXTAUTH_SECRET || 'spasi-super-secret-key-2026-antigravity',
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
