import type { NextAuthConfig } from "next-auth";

export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.role === "string") {
          session.user.role = token.role as typeof session.user.role;
        }
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
