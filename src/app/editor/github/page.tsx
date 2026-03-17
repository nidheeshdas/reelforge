'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Folder, FileText, ArrowLeft, RefreshCw } from 'lucide-react';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
}

interface Content {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

export default function GitHubBrowserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<Content | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/account/connections');
      if (response.ok) {
        const data = (await response.json()) as {
          connections?: Array<{ provider: string }>;
        };
        const github = data.connections?.find((c: { provider: string }) => c.provider === 'github');
        if (github) {
          loadRepos();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/github/repos');
      if (response.ok) {
        const data = (await response.json()) as { repos?: Repo[] };
        setRepos(data.repos || []);
      }
    } catch (error) {
      console.error('Failed to load repos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = '/api/auth/connect/github?callbackUrl=/editor/github';
  };

  const handleRepoSelect = async (repo: Repo) => {
    setSelectedRepo(repo);
    setCurrentPath('');
    setPathHistory([]);
    loadContents(repo.full_name, '');
  };

  const loadContents = async (fullName: string, path: string) => {
    try {
      const url = `/api/integrations/github/repos/${fullName.split('/')[0]}/${fullName.split('/')[1]}/contents?path=${path}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json()) as { contents?: Content[] };
        setContents(data.contents || []);
      }
    } catch (error) {
      console.error('Failed to load contents:', error);
    }
  };

  const handleNavigate = (content: Content) => {
    if (content.type === 'dir') {
      setPathHistory([...pathHistory, currentPath]);
      setCurrentPath(content.path);
      if (selectedRepo) {
        loadContents(selectedRepo.full_name, content.path);
      }
    } else {
      loadFileContent(content);
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(previousPath);
      if (selectedRepo) {
        loadContents(selectedRepo.full_name, previousPath);
      }
    }
  };

  const loadFileContent = async (content: Content) => {
    if (!selectedRepo) return;
    
    try {
      const url = `/api/integrations/github/file/${selectedRepo.full_name.split('/')[0]}/${selectedRepo.full_name.split('/')[1]}?path=${content.path}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json()) as { content?: string };
        setSelectedFile(content);
        setFileContent(data.content || '');
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const handleImport = () => {
    if (fileContent) {
      localStorage.setItem('vidscript_import', fileContent);
      router.push('/editor?import=github');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/editor')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
            <h1 className="text-2xl font-bold">Import from GitHub</h1>
          </div>
          <Button onClick={loadRepos} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {!selectedRepo ? (
          <Card>
            <CardHeader>
              <CardTitle>Select a Repository</CardTitle>
            </CardHeader>
            <CardContent>
              {repos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No repositories found. Connect your GitHub account to browse your repos.</p>
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect GitHub'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {repos.map((repo) => (
                    <Card 
                      key={repo.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleRepoSelect(repo)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Folder className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-medium">{repo.name}</h3>
                            {repo.description && (
                              <p className="text-sm text-gray-500 line-clamp-2">{repo.description}</p>
                            )}
                            {repo.private && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                                Private
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    {selectedRepo.name}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRepo(null)}>
                    Change Repo
                  </Button>
                </div>
                {currentPath && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={handleBack} disabled={pathHistory.length === 0}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-500">{currentPath}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {contents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No .vs files found in this directory</p>
                ) : (
                  <div className="space-y-2">
                    {contents.map((item) => (
                      <div
                        key={item.sha}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleNavigate(item)}
                      >
                        {item.type === 'dir' ? (
                          <Folder className="h-4 w-4 text-gray-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedFile ? selectedFile.name : 'Select a file to preview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFile ? (
                  <div className="space-y-4">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                      <code>{fileContent}</code>
                    </pre>
                    <div className="flex gap-2">
                      <Button onClick={handleImport} disabled={importing}>
                        {importing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          'Import to Editor'
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedFile(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Click on a .vs file to preview and import
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
