'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { signIn, useSession } from 'next-auth/react';
import { 
  Upload, 
  FolderOpen, 
  Cloud, 
  Video, 
  Music, 
  Image, 
  FileText,
  Loader2,
  Trash2,
  Plus,
  Link2
} from 'lucide-react';

interface Asset {
  id: number;
  filename: string;
  fileType: string;
  fileSize: number;
  duration?: number;
  source?: string;
}

interface AssetLibraryProps {
  onInsertAsset?: (assetPath: string) => void;
}

export function AssetLibrary({ onInsertAsset }: AssetLibraryProps) {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('local');
  const [gdriveFiles, setGdriveFiles] = useState<any[]>([]);
  const [dropboxFiles, setDropboxFiles] = useState<any[]>([]);
  const [connections, setConnections] = useState<any>({});

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/account/connections');
      if (response.ok) {
        const data = await response.json();
        const connMap: Record<string, any> = {};
        data.connections?.forEach((c: any) => {
          connMap[c.provider] = c;
        });
        setConnections(connMap);
        
        if (connMap['google-drive']) {
          loadGdriveFiles();
        }
        if (connMap['dropbox']) {
          loadDropboxFiles();
        }
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, []);

  const loadGdriveFiles = async () => {
    try {
      const response = await fetch('/api/integrations/google-drive/files');
      if (response.ok) {
        const data = await response.json();
        setGdriveFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load GDrive files:', error);
    }
  };

  const loadDropboxFiles = async () => {
    try {
      const response = await fetch('/api/integrations/dropbox/files');
      if (response.ok) {
        const data = await response.json();
        setDropboxFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load Dropbox files:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          await loadAssets();
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAssets(assets.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleConnectGoogleDrive = () => {
    signIn('google', { callbackUrl: '/editor' });
  };

  const handleConnectDropbox = () => {
    window.location.href = '/api/auth/dropbox';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video')) return <Video className="h-4 w-4 text-blue-500" />;
    if (type.startsWith('audio')) return <Music className="h-4 w-4 text-green-500" />;
    if (type.startsWith('image')) return <Image className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const renderAssetCard = (asset: any, source?: string) => (
    <Card key={asset.id} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {getFileIcon(asset.fileType || asset.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{asset.filename || asset.name}</p>
            <p className="text-xs text-gray-500">
              {formatFileSize(Number(asset.fileSize || asset.size))}
              {formatDuration(asset.duration) && ` • ${formatDuration(asset.duration)}`}
              {source && ` • ${source}`}
            </p>
          </div>
          {source === 'local' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(asset.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!session) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500 mb-4">Sign in to manage your assets</p>
        <Button onClick={() => signIn()}>Sign In</Button>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <TabsList className="grid grid-cols-3 mx-4 mt-2">
        <TabsTrigger value="local" className="text-xs">
          <Upload className="h-3 w-3 mr-1" />
          Local
        </TabsTrigger>
        <TabsTrigger value="gdrive" className="text-xs">
          <Cloud className="h-3 w-3 mr-1" />
          Drive
        </TabsTrigger>
        <TabsTrigger value="dropbox" className="text-xs">
          <Cloud className="h-3 w-3 mr-1" />
          Dropbox
        </TabsTrigger>
      </TabsList>

      <TabsContent value="local" className="flex-1 overflow-auto m-0 p-4 pt-2">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-2">Drag & drop files here</p>
            <p className="text-xs text-gray-400 mb-3">or click to browse</p>
            <Input
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
            />
            <Button asChild disabled={uploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </label>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : assets.length > 0 ? (
            <div className="space-y-2">
              {assets.map(asset => renderAssetCard(asset, 'local'))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8 text-sm">No assets yet</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="gdrive" className="flex-1 overflow-auto m-0 p-4 pt-2">
        {connections['google-drive'] ? (
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={loadGdriveFiles} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {gdriveFiles.length > 0 ? (
              gdriveFiles.map(file => renderAssetCard({ ...file, id: file.id }, 'google-drive'))
            ) : (
              <p className="text-center text-gray-500 py-8 text-sm">No compatible files found</p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Cloud className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">Connect Google Drive to browse your files</p>
            <Button onClick={handleConnectGoogleDrive}>
              <Link2 className="h-4 w-4 mr-2" />
              Connect Google Drive
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="dropbox" className="flex-1 overflow-auto m-0 p-4 pt-2">
        {connections['dropbox'] ? (
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={loadDropboxFiles} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {dropboxFiles.length > 0 ? (
              dropboxFiles.map(file => renderAssetCard({ ...file, id: file.id }, 'dropbox'))
            ) : (
              <p className="text-center text-gray-500 py-8 text-sm">No compatible files found</p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Cloud className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">Connect Dropbox to browse your files</p>
            <Button onClick={handleConnectDropbox}>
              <Link2 className="h-4 w-4 mr-2" />
              Connect Dropbox
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function RefreshCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
