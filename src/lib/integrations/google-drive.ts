import { google } from 'googleapis';
import { decrypt } from '@/lib/auth/encryption';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  parents?: string[];
  isFolder: boolean;
}

export class GoogleDriveService {
  private oauth2Client: any;
  private accessToken: string;

  constructor(encryptedToken: string) {
    this.accessToken = decrypt(encryptedToken);
    this.oauth2Client = new google.auth.OAuth2();
    this.oauth2Client.setCredentials({ access_token: this.accessToken });
  }

  async listFiles(folderId: string = 'root'): Promise<DriveFile[]> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, modifiedTime, thumbnailLink, webContentLink, parents)',
      orderBy: 'name',
    });

    return (response.data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      thumbnailLink: file.thumbnailLink,
      webContentLink: file.webContentLink,
      parents: file.parents,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  async getFileContent(fileId: string): Promise<Buffer> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data as ArrayBuffer);
  }

  async uploadFile(
    parentFolderId: string,
    fileName: string,
    content: Buffer,
    mimeType: string
  ): Promise<DriveFile> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType,
        parents: [parentFolderId],
      },
      media: {
        mimeType,
        body: Buffer.from(content),
      },
      fields: 'id, name, mimeType',
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: response.data.mimeType!,
      isFolder: false,
    };
  }

  async getUserInfo(): Promise<{ email: string; name: string }> {
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    
    const response = await oauth2.userinfo.get();
    
    return {
      email: response.data.email || '',
      name: response.data.name || '',
    };
  }

  async getRootFolderId(): Promise<string> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    const response = await drive.files.get({
      fileId: 'root',
      fields: 'id',
    });

    return response.data.id || 'root';
  }

  static getAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google-drive'
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent',
    });
  }

  static async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiryDate: number }> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google-drive'
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiryDate: tokens.expiry_date || 0,
    };
  }
}

export async function getGoogleDriveService(userId: number): Promise<GoogleDriveService | null> {
  const prisma = await import('@/lib/db/prisma').then(m => m.default);
  
  const connection = await prisma.connectedApp.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'google-drive',
      },
    },
  });
  
  if (!connection || !connection.accessToken) {
    return null;
  }
  
  return new GoogleDriveService(connection.accessToken);
}
