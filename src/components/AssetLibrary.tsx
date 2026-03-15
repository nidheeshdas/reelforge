'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import {
  Cloud,
  Download,
  FolderOpen,
  Image,
  Link2,
  Loader2,
  Lock,
  Music,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

interface Asset {
  id: number | string;
  filename: string;
  filepath?: string;
  fileType: string;
  fileSize: number;
  duration?: number;
  source?: string;
}

interface CloudFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: string | number;
  modifiedTime?: string;
  path?: string;
  isFolder?: boolean;
}

interface AssetLibraryProps {
  onInsertAsset?: (assetPath: string) => void;
  mode?: 'panel' | 'page';
}

type SourceTab = 'local' | 'samples' | 'gdrive' | 'dropbox';

export function AssetLibrary({ onInsertAsset, mode = 'panel' }: AssetLibraryProps) {
  const { data: session, status } = useSession();
  const [localAssets, setLocalAssets] = useState<Asset[]>([]);
  const [sampleAssets, setSampleAssets] = useState<Asset[]>([]);
  const [gdriveFiles, setGdriveFiles] = useState<CloudFile[]>([]);
  const [dropboxFiles, setDropboxFiles] = useState<CloudFile[]>([]);
  const [connections, setConnections] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<SourceTab>('local');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [loadingDropbox, setLoadingDropbox] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isAuthenticated = status === 'authenticated' && !!session;
  const isPageMode = mode === 'page';

  useEffect(() => {
    setActiveTab(isAuthenticated ? 'local' : 'samples');
  }, [isAuthenticated]);

  const loadLocalAssets = useCallback(async () => {
    if (!isAuthenticated) {
      setLocalAssets([]);
      return;
    }

    setLoadingLocal(true);
    try {
      const response = await fetch('/api/assets');
      if (!response.ok) {
        throw new Error('Failed to fetch local assets');
      }

      const data = await response.json();
      setLocalAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to load assets:', error);
      setLocalAssets([]);
    } finally {
      setLoadingLocal(false);
    }
  }, [isAuthenticated]);

  const loadSampleAssets = useCallback(async () => {
    setLoadingSamples(true);
    try {
      const response = await fetch('/api/assets/samples');
      if (!response.ok) {
        throw new Error('Failed to fetch sample assets');
      }

      const data = await response.json();
      setSampleAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to load sample assets:', error);
      setSampleAssets([]);
    } finally {
      setLoadingSamples(false);
    }
  }, []);

  const loadGdriveFiles = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingDrive(true);
    try {
      const response = await fetch('/api/integrations/google-drive/files');
      if (!response.ok) {
        throw new Error('Failed to fetch Google Drive files');
      }

      const data = await response.json();
      setGdriveFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load Google Drive files:', error);
      setGdriveFiles([]);
    } finally {
      setLoadingDrive(false);
    }
  }, [isAuthenticated]);

  const loadDropboxFiles = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingDropbox(true);
    try {
      const response = await fetch('/api/integrations/dropbox/files');
      if (!response.ok) {
        throw new Error('Failed to fetch Dropbox files');
      }

      const data = await response.json();
      setDropboxFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load Dropbox files:', error);
      setDropboxFiles([]);
    } finally {
      setLoadingDropbox(false);
    }
  }, [isAuthenticated]);

  const loadConnections = useCallback(async () => {
    if (!isAuthenticated) {
      setConnections({});
      return;
    }

    try {
      const response = await fetch('/api/account/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const data = await response.json();
      const connectionMap: Record<string, unknown> = {};
      data.connections?.forEach((connection: { provider: string }) => {
        connectionMap[connection.provider] = connection;
      });
      setConnections(connectionMap);
    } catch (error) {
      console.error('Failed to load connections:', error);
      setConnections({});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadSampleAssets();
  }, [loadSampleAssets]);

  useEffect(() => {
    if (status === 'loading') return;
    void loadLocalAssets();
    void loadConnections();
  }, [loadConnections, loadLocalAssets, status]);

  useEffect(() => {
    if (!connections['google-drive']) {
      setGdriveFiles([]);
      return;
    }
    void loadGdriveFiles();
  }, [connections, loadGdriveFiles]);

  useEffect(() => {
    if (!connections.dropbox) {
      setDropboxFiles([]);
      return;
    }
    void loadDropboxFiles();
  }, [connections, loadDropboxFiles]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !isAuthenticated) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/assets', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      await loadLocalAssets();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`/api/assets?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }
      setLocalAssets((current) => current.filter((asset) => asset.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || !Number.isFinite(seconds)) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.startsWith('video')) return <Video className="h-4 w-4 text-blue-300" />;
    if (normalized.startsWith('audio')) return <Music className="h-4 w-4 text-emerald-300" />;
    if (normalized.startsWith('image')) return <Image className="h-4 w-4 text-fuchsia-300" />;
    return <FolderOpen className="h-4 w-4 text-slate-300" />;
  };

  const localCount = localAssets.length;
  const sampleCount = sampleAssets.length;
  const connectedSources = Object.keys(connections).length;

  const assetSummaryCards = useMemo(
    () => [
      {
        label: 'Local library',
        value: localCount,
        tone: '#60a5fa',
      },
      {
        label: 'Sample assets',
        value: sampleCount,
        tone: '#c084fc',
      },
      {
        label: 'Connected sources',
        value: connectedSources,
        tone: '#34d399',
      },
    ],
    [connectedSources, localCount, sampleCount]
  );

  const renderAssetCard = (
    asset: {
      id: number | string;
      filename: string;
      filepath?: string;
      fileType: string;
      fileSize: number;
      duration?: number;
    },
    sourceLabel: string,
    removable = false,
  ) => {
    const canInsert = !!onInsertAsset && !!asset.filepath;

    return (
      <Card
        key={`${sourceLabel}-${asset.id}`}
        className="border-slate-800/80 bg-slate-950/55 shadow-none"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80"
            >
              {getFileIcon(asset.fileType)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-100">{asset.filename}</p>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
                  style={{ borderColor: '#23314f', color: '#8fb1ff', background: '#101a2f' }}
                >
                  {sourceLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {formatFileSize(Number(asset.fileSize))}
                {formatDuration(asset.duration) ? ` • ${formatDuration(asset.duration)}` : ''}
              </p>
              {asset.filepath && (
                <p className="mt-1 truncate text-[11px] text-slate-500">{asset.filepath}</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canInsert ? (
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => onInsertAsset?.(asset.filepath!)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Insert into script
              </Button>
            ) : (
              <div className="rounded-md border border-slate-800 px-2.5 py-1.5 text-xs text-slate-400">
                Import-only source
              </div>
            )}
            {removable && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900"
                onClick={() => handleDelete(asset.id)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCloudFiles = (
    files: CloudFile[],
    sourceLabel: string,
    loading: boolean,
    onRefresh: () => void,
    configured: boolean,
    providerLabel: string,
  ) => {
    if (!isAuthenticated) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-6 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-100">{providerLabel} requires sign-in</h4>
          <p className="mt-2 text-sm text-slate-400">
            Browse sample assets now, then sign in to connect your own cloud drives.
          </p>
          <Button className="mt-4" onClick={() => signIn(undefined, { callbackUrl: '/assets' })}>
            Sign in to continue
          </Button>
        </div>
      );
    }

    if (!configured) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-6 text-center">
          <Cloud className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-100">{providerLabel} not connected</h4>
          <p className="mt-2 text-sm text-slate-400">
            Finish the OAuth setup in your account page, then come back here to browse files.
          </p>
          <Button asChild variant="outline" className="mt-4 border-slate-700 bg-transparent text-slate-100">
            <Link href="/account">Open account settings</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{providerLabel} browser</p>
            <p className="text-xs text-slate-400">
              Import files into your workflow once they are linked into ReelForge storage.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-100"
            onClick={onRefresh}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) =>
              renderAssetCard(
                {
                  id: file.id,
                  filename: file.name,
                  fileType: file.mimeType || 'file',
                  fileSize: Number(file.size || 0),
                },
                sourceLabel,
              )
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/55 px-4 py-8 text-center text-sm text-slate-400">
            No compatible files found yet.
          </div>
        )}
      </div>
    );
  };

  const renderLibrarySection = (
    assets: Asset[],
    {
      emptyTitle,
      emptyDescription,
      sourceLabel,
      removable,
      showUpload,
      loading,
    }: {
      emptyTitle: string;
      emptyDescription: string;
      sourceLabel: string;
      removable: boolean;
      showUpload: boolean;
      loading: boolean;
    }
  ) => (
    <div className="space-y-4">
      {showUpload && (
        <div className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(21,32,55,0.95),rgba(12,18,32,0.95))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">Upload new assets</p>
              <p className="mt-1 text-sm text-slate-400">
                Add video, audio, or image files to your working library for quick insertion.
              </p>
            </div>
            <div className="rounded-full border border-blue-400/30 bg-blue-500/10 p-2 text-blue-200">
              <Upload className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/50 p-5 text-center">
            <p className="text-sm text-slate-200">Drag files here or pick them from disk.</p>
            <p className="mt-1 text-xs text-slate-500">Supported: video, audio, and image files.</p>
            <Input
              id={`file-upload-${mode}`}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              onChange={handleUpload}
              className="hidden"
            />
            <Button asChild disabled={uploading} className="mt-4 bg-blue-600 text-white hover:bg-blue-500">
              <label htmlFor={`file-upload-${mode}`} className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Choose files
                  </>
                )}
              </label>
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : assets.length > 0 ? (
        <div className="space-y-3">
          {assets.map((asset) => renderAssetCard(asset, sourceLabel, removable))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/55 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-100">{emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-400">{emptyDescription}</p>
        </div>
      )}
    </div>
  );

  const tabTriggerClass =
    'gap-1.5 rounded-xl border border-transparent px-3 py-2 text-xs font-medium text-slate-400 transition data-[state=active]:border-slate-700 data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50 data-[state=active]:shadow-none hover:text-slate-200';

  const tabContentClass =
    'm-0 mt-4 min-h-0 flex-1 overflow-y-auto rounded-[1.4rem] border border-slate-800/80 bg-slate-950/45 p-4 pr-3';

  return (
    <div className={`flex h-full min-h-0 flex-col ${isPageMode ? 'gap-6 p-6' : 'gap-4 p-4'}`}>
      <div className="rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(18,27,47,0.98),rgba(10,15,26,0.95))] p-5 shadow-[0_20px_60px_rgba(5,10,20,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Asset workspace
            </div>
            <h3 className="text-lg font-semibold text-slate-100">
              {isPageMode ? 'Bring your media into ReelForge' : 'Manage sources for your script'}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {isAuthenticated
                ? 'Upload local files, browse sample media, and prepare your connected cloud sources for importing into scripts.'
                : 'Browse bundled sample assets now, then sign in to upload your own library and connect external drives.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isAuthenticated ? (
              <>
                <Button onClick={() => signIn(undefined, { callbackUrl: '/assets' })}>
                  Sign in to upload
                </Button>
                <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-100">
                  <Link href="/editor">Open editor</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-100">
                  <Link href="/editor">Back to editor</Link>
                </Button>
                <Button asChild className="bg-blue-600 text-white hover:bg-blue-500">
                  <Link href="/account">Manage connections</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className={`mt-5 grid gap-3 ${isPageMode ? 'md:grid-cols-3' : 'grid-cols-1'}`}>
          {assetSummaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: '#1f2a44',
                background: 'rgba(8, 13, 25, 0.72)',
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: card.tone }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SourceTab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-1.5">
          <TabsTrigger value="local" className={tabTriggerClass}>
            <Upload className="h-3.5 w-3.5" />
            Local
          </TabsTrigger>
          <TabsTrigger value="samples" className={tabTriggerClass}>
            <Download className="h-3.5 w-3.5" />
            Samples
          </TabsTrigger>
          <TabsTrigger value="gdrive" className={tabTriggerClass}>
            <Cloud className="h-3.5 w-3.5" />
            Drive
          </TabsTrigger>
          <TabsTrigger value="dropbox" className={tabTriggerClass}>
            <Cloud className="h-3.5 w-3.5" />
            Dropbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className={tabContentClass}>
          {isAuthenticated ? (
            renderLibrarySection(localAssets, {
              emptyTitle: 'No local assets yet',
              emptyDescription: 'Upload a few clips or tracks to start building your project library.',
              sourceLabel: 'local',
              removable: true,
              showUpload: true,
              loading: loadingLocal,
            })
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-6 text-center">
              <Lock className="mx-auto mb-3 h-10 w-10 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-100">Sign in to create a local library</h4>
              <p className="mt-2 text-sm text-slate-400">
                Your own uploads appear here once you authenticate. Until then, use the Samples tab to experiment.
              </p>
              <Button className="mt-4" onClick={() => signIn(undefined, { callbackUrl: '/assets' })}>
                Sign in
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="samples" className={tabContentClass}>
          {renderLibrarySection(sampleAssets, {
            emptyTitle: 'No sample assets available',
            emptyDescription: 'The bundled media pack is empty right now.',
            sourceLabel: 'sample',
            removable: false,
            showUpload: false,
            loading: loadingSamples,
          })}
        </TabsContent>

        <TabsContent value="gdrive" className={tabContentClass}>
          {renderCloudFiles(
            gdriveFiles,
            'drive',
            loadingDrive,
            () => void loadGdriveFiles(),
            !!connections['google-drive'],
            'Google Drive',
          )}
        </TabsContent>

        <TabsContent value="dropbox" className={tabContentClass}>
          {renderCloudFiles(
            dropboxFiles,
            'dropbox',
            loadingDropbox,
            () => void loadDropboxFiles(),
            !!connections.dropbox,
            'Dropbox',
          )}
        </TabsContent>
      </Tabs>

      {isPageMode && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-slate-800 bg-slate-950/55 shadow-none lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 text-slate-200">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Asset workflow</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Upload local media for immediate use, use bundled samples to prototype, and connect cloud providers when you are ready to import from external storage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/55 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-slate-100">Need integrations?</p>
              <p className="mt-1 text-sm text-slate-400">
                Configure Google Drive and Dropbox credentials in your deployment environment, then connect them from the account page.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full border-slate-700 bg-transparent text-slate-100">
                <Link href="/account">
                  <Link2 className="mr-2 h-4 w-4" />
                  Open account settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
