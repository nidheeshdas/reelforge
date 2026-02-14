import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      credits: number;
      isCreator: boolean;
    };
  }

  interface User {
    credits?: number;
    isCreator?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    credits: number;
    isCreator: boolean;
  }
}
