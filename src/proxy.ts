import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export default isDev 
  ? function proxy() {
      return NextResponse.next();
    }
  : withAuth({
      pages: {
        signIn: '/auth/login',
      },
    });

export const config = {
  matcher: [
    '/editor/:path*',
    '/account/:path*',
    '/templates/:path*',
  ],
};
