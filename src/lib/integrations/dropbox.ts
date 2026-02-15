import { Dropbox } from 'dropbox';
import { decrypt } from '@/lib/auth/encryption';

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  modified?: string;
  isFolder: boolean;
  thumbnail?: string;
}

export class DropboxService {
  private dbx: Dropbox;
  private accessToken: string;

  constructor(encryptedToken: string) {
    this.accessToken = decrypt(encryptedToken);
    this.dbx = new Dropbox({ accessToken: this.accessToken });
  }

  async listFiles(path: string = ''): Promise<DropboxFile[]> {
    const response = await this.dbx.filesListFolder({ path });
    
    return (response.result.entries || []).map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      path: entry.path_display || entry.path_lower || '',
      size: entry.size,
      modified: entry.client_modified,
      isFolder: entry['.tag'] === 'folder',
    }));
  }

  async getFileContent(path: string): Promise<Buffer> {
    const response = await this.dbx.filesDownload({ path });
    
    const fileBinary = (response.result as any).fileBinary;
    return Buffer.from(fileBinary);
  }

  async uploadFile(
    path: string,
    content: Buffer,
    mode: 'add' | 'overwrite' = 'add'
  ): Promise<DropboxFile> {
    const response = await this.dbx.filesUpload({
      path,
      contents: content,
      mode: { '.tag': mode },
    });

    return {
      id: response.result.id,
      name: response.result.name,
      path: response.result.path_display || '',
      isFolder: false,
    };
  }

  async getUserInfo(): Promise<{ email: string; name: string }> {
    const response = await this.dbx.usersGetCurrentAccount();
    
    return {
      email: response.result.email || '',
      name: response.result.name?.display_name || '',
    };
  }

  static getAuthUrl(): string {
    const clientId = process.env.DROPBOX_APP_KEY;
    const redirectUri = process.env.NEXTAUTH_URL + '/api/auth/callback/dropbox';
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline`;
    return authUrl;
  }

  static async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.DROPBOX_APP_KEY || '',
        client_secret: process.env.DROPBOX_APP_SECRET || '',
        redirect_uri: process.env.NEXTAUTH_URL + '/api/auth/callback/dropbox',
      }),
    });

    const data = await response.json();

    return {
      accessToken: data.access_token || '',
      refreshToken: data.refresh_token,
    };
  }
}

export async function getDropboxService(userId: number): Promise<DropboxService | null> {
  const prisma = await import('@/lib/db/prisma').then(m => m.default);
  
  const connection = await prisma.connectedApp.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'dropbox',
      },
    },
  });
  
  if (!connection || !connection.accessToken) {
    return null;
  }
  
  return new DropboxService(connection.accessToken);
}
