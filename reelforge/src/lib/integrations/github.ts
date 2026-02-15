import { decrypt } from '@/lib/auth/encryption';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
  content?: string;
  encoding?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
}

export class GitHubService {
  private accessToken: string;

  constructor(encryptedToken: string) {
    this.accessToken = decrypt(encryptedToken);
  }

  private async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  async listRepos(): Promise<GitHubRepo[]> {
    const response = await this.fetchWithAuth('https://api.github.com/user/repos?sort=updated&per_page=100');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch repos: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const response = await this.fetchWithAuth(`https://api.github.com/repos/${owner}/${repo}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch repo: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getContents(owner: string, repo: string, path: string = ''): Promise<GitHubContent[]> {
    const response = await this.fetchWithAuth(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contents: ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const response = await this.fetchWithAuth(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    
    return '';
  }

  async getFileSha(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const response = await this.fetchWithAuth(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.sha;
    } catch {
      return null;
    }
  }

  async saveFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main'
  ): Promise<void> {
    const sha = await this.getFileSha(owner, repo, path);
    
    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    };
    
    if (sha) {
      body.sha = sha;
    }
    
    const response = await this.fetchWithAuth(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to save file: ${error.message || response.statusText}`);
    }
  }

  async getHistory(owner: string, repo: string, path: string): Promise<GitHubCommit[]> {
    const response = await this.fetchWithAuth(
      `https://api.github.com/repos/${owner}/${repo}/commits?path=${path}&per_page=10`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getUser(): Promise<{ login: string; name: string; email: string }> {
    const response = await this.fetchWithAuth('https://api.github.com/user');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export async function getGitHubService(userId: number): Promise<GitHubService | null> {
  const prisma = await import('@/lib/db/prisma').then(m => m.default);
  
  const connection = await prisma.connectedApp.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'github',
      },
    },
  });
  
  if (!connection || !connection.accessToken) {
    return null;
  }
  
  return new GitHubService(connection.accessToken);
}
