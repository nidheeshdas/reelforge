'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  FolderOpen,
  Key,
  Link2,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  Upload,
  User,
  XCircle,
} from 'lucide-react';
import { getAccountNotice, type AccountNotice } from '@/lib/account/account-notices';

interface ApiKey {
  id: string;
  provider: string;
  name: string | null;
  isDefault: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Connection {
  id: string;
  provider: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ConnectionCardConfig {
  provider: string;
  title: string;
  description: string;
  envKeys: string[];
  connectHref?: string;
  connectedDetail: string;
  disconnectedDetail: string;
  destinationLabel: string;
  destinationHref: string;
  accentClass: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  github: 'GitHub',
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox',
};

const CONNECTIONS: ConnectionCardConfig[] = [
  {
    provider: 'github',
    title: 'GitHub',
    description: 'Import VidScript files from repositories and continue editing them inside ReelForge.',
    envKeys: ['GITHUB_ID', 'GITHUB_SECRET'],
    connectHref: '/api/auth/connect/github?callbackUrl=/account',
    connectedDetail: 'Connected for repository browsing and file import.',
    disconnectedDetail: 'Connect GitHub to open repositories from the editor import flow.',
    destinationLabel: 'Open GitHub browser',
    destinationHref: '/editor/github',
    accentClass: 'from-slate-300/15 to-slate-500/10 text-slate-100',
  },
  {
    provider: 'google-drive',
    title: 'Google Drive',
    description: 'Browse Drive folders and bring referenced media into your ReelForge asset workflow.',
    envKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    connectHref: '/api/auth/connect/google-drive?callbackUrl=/account',
    connectedDetail: 'Connected for Drive browsing in the Assets workspace.',
    disconnectedDetail: 'Add OAuth keys, then connect Drive to browse cloud media.',
    destinationLabel: 'Open asset workspace',
    destinationHref: '/assets',
    accentClass: 'from-blue-400/20 to-cyan-400/10 text-blue-100',
  },
  {
    provider: 'dropbox',
    title: 'Dropbox',
    description: 'Attach Dropbox as another source for cloud-hosted videos, audio, and graphics.',
    envKeys: ['DROPBOX_APP_KEY', 'DROPBOX_APP_SECRET'],
    connectHref: '/api/auth/connect/dropbox?callbackUrl=/account',
    connectedDetail: 'Connected for Dropbox browsing in the Assets workspace.',
    disconnectedDetail: 'Add OAuth keys, then connect Dropbox to browse cloud media.',
    destinationLabel: 'Open asset workspace',
    destinationHref: '/assets',
    accentClass: 'from-sky-400/20 to-indigo-400/10 text-sky-100',
  },
];

const tabTriggerClass =
  'gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition data-[state=active]:border-slate-700 data-[state=active]:bg-slate-900/90 data-[state=active]:text-slate-50 data-[state=active]:shadow-none hover:text-slate-200';

const sectionCardClass = 'border-slate-800 bg-slate-950/70 text-slate-100 shadow-none';

async function readResponseError(response: Response, fallback: string) {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function AccountPageContent() {
  const { data: session, status, update: updateSession } = useSession();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKeyProvider, setNewApiKeyProvider] = useState('openai');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [actionNotice, setActionNotice] = useState<AccountNotice | null>(null);

  const queryNotice = useMemo(
    () =>
      getAccountNotice({
        connected: searchParams.get('connected'),
        error: searchParams.get('error'),
      }),
    [searchParams]
  );

  const activeNotice = actionNotice ?? queryNotice;
  const connectionsByProvider = useMemo(
    () => new Map(connections.map((connection) => [connection.provider, connection])),
    [connections]
  );

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setName(session.user?.name || '');
    void loadData();
  }, [session]);

  const loadData = async () => {
    try {
      const [keysRes, connRes] = await Promise.all([
        fetch('/api/account/api-keys'),
        fetch('/api/account/connections'),
      ]);

      if (!keysRes.ok) {
        throw new Error(await readResponseError(keysRes, 'Failed to fetch API keys.'));
      }

      if (!connRes.ok) {
        throw new Error(await readResponseError(connRes, 'Failed to fetch connected services.'));
      }

      const keysData = await keysRes.json();
      const connData = await connRes.json();

      setApiKeys(keysData.keys || []);
      setConnections(connData.connections || []);
    } catch (error) {
      console.error('Failed to load account data:', error);
      setActionNotice({
        tone: 'error',
        title: 'Unable to load account data',
        description: error instanceof Error ? error.message : 'Please refresh the page and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const setSuccessNotice = (title: string, description: string) =>
    setActionNotice({ tone: 'success', title, description });
  const setErrorNotice = (title: string, description: string) =>
    setActionNotice({ tone: 'error', title, description });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save profile.'));
      }

      await updateSession({ name });
      setSuccessNotice('Profile updated', 'Your display name has been saved.');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrorNotice(
        'Profile update failed',
        error instanceof Error ? error.message : 'Please try saving your profile again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!newApiKey.trim()) return;

    setAddingKey(true);
    try {
      const response = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newApiKeyProvider,
          key: newApiKey.trim(),
          name: newApiKeyName.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to add API key.'));
      }

      setNewApiKey('');
      setNewApiKeyName('');
      await loadData();
      setSuccessNotice(
        'API key added',
        `${PROVIDER_NAMES[newApiKeyProvider] || newApiKeyProvider} is ready to use for AI actions.`
      );
    } catch (error) {
      console.error('Failed to add API key:', error);
      setErrorNotice(
        'API key could not be added',
        error instanceof Error ? error.message : 'Please check the key and try again.'
      );
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string, provider: string) => {
    try {
      const response = await fetch(`/api/account/api-keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete API key.'));
      }

      setApiKeys((current) => current.filter((key) => key.id !== id));
      setSuccessNotice('API key removed', `${PROVIDER_NAMES[provider] || provider} has been removed.`);
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setErrorNotice(
        'API key removal failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const handleSetDefault = async (id: string, provider: string) => {
    try {
      const response = await fetch(`/api/account/api-keys/${id}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to set default API key.'));
      }

      await loadData();
      setSuccessNotice(
        'Default updated',
        `${PROVIDER_NAMES[provider] || provider} is now the default key for that provider.`
      );
    } catch (error) {
      console.error('Failed to set default:', error);
      setErrorNotice(
        'Default key update failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const response = await fetch(`/api/account/connections/${provider}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to disconnect provider.'));
      }

      setConnections((current) => current.filter((connection) => connection.provider !== provider));
      setSuccessNotice(
        'Connection removed',
        `${PROVIDER_NAMES[provider] || provider} has been disconnected from your workspace.`
      );
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setErrorNotice(
        'Disconnect failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const getInitials = (value: string) =>
    value
      .split(' ')
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'RF';

  const apiKeyCount = apiKeys.length;
  const connectedCount = connections.length;
  const availableIntegrations = CONNECTIONS.length;

  if (status === 'loading' || (session && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const renderNotice = (notice: AccountNotice | null) => {
    if (!notice) return null;

    const isSuccess = notice.tone === 'success';
    const Icon = isSuccess ? CheckCircle2 : XCircle;

    return (
      <div
        className={`rounded-2xl border px-4 py-3 ${
          isSuccess
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-full p-1.5 ${
              isSuccess ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className={`mt-1 text-sm ${isSuccess ? 'text-emerald-100/80' : 'text-rose-100/80'}`}>
              {notice.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderConnectionCard = (config: ConnectionCardConfig) => {
    const isConnected = connectionsByProvider.has(config.provider);

    return (
      <Card key={config.provider} className={sectionCardClass}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className={`rounded-2xl border border-slate-800 bg-gradient-to-br px-3 py-2 text-sm font-semibold ${config.accentClass}`}
            >
              {config.title}
            </div>
            <Badge
              variant="outline"
              className={
                isConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700 bg-slate-900/80 text-slate-300'
              }
            >
              {isConnected ? 'Connected' : 'Setup needed'}
            </Badge>
          </div>

          <p className="mt-4 text-sm text-slate-300">{config.description}</p>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Required environment keys</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {config.envKeys.map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300"
                >
                  {key}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {isConnected ? config.connectedDetail : config.disconnectedDetail}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isConnected ? (
              <Button
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900"
                onClick={() => handleDisconnect(config.provider)}
              >
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => (window.location.href = config.connectHref || '/account')}>
                Connect
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900"
            >
              <Link href={config.destinationHref}>
                {config.destinationLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)] text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-100 no-underline transition hover:border-slate-700 hover:bg-slate-900"
            >
              <User className="h-4 w-4" />
              ReelForge
            </Link>
            <div>
              <div className="text-sm font-semibold text-slate-100">Account workspace</div>
              <div className="text-xs text-slate-500">Identity, API keys, and connected services</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900">
              <Link href="/assets">Assets</Link>
            </Button>
            {session ? (
              <Button variant="ghost" className="text-slate-100 hover:bg-slate-900" onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button onClick={() => signIn(undefined, { callbackUrl: '/account' })}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {!session ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(18,27,47,0.98),rgba(10,15,26,0.95))] p-6 shadow-[0_20px_60px_rgba(5,10,20,0.25)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-200">
                  <Cloud className="h-3.5 w-3.5" />
                  Account setup
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-slate-50">Connect your ReelForge workspace</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Sign in to manage LLM keys, connect GitHub, Google Drive, and Dropbox, and keep your import workflows in one place.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => signIn(undefined, { callbackUrl: '/account' })}>Sign in to continue</Button>
                  <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900">
                    <Link href="/auth/register">Create account</Link>
                  </Button>
                </div>
              </div>

              <Card className={sectionCardClass}>
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-slate-100">What you can manage here</p>
                  <div className="mt-4 grid gap-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      Profile details and secure sign-in access
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      API keys for OpenAI, Anthropic, and OpenRouter
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      GitHub, Google Drive, and Dropbox connections
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {renderNotice(activeNotice)}

            <div className="grid gap-4 lg:grid-cols-3">
              {CONNECTIONS.map((config) => renderConnectionCard(config))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              <div className="rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(18,27,47,0.98),rgba(10,15,26,0.95))] p-6 shadow-[0_20px_60px_rgba(5,10,20,0.25)]">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border border-slate-700 bg-slate-900">
                      <AvatarFallback className="bg-slate-900 text-lg text-slate-100">
                        {getInitials(session.user?.name || session.user?.email || 'RF')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-blue-200">Account workspace</div>
                      <h1 className="mt-1 text-3xl font-semibold text-slate-50">
                        {session.user?.name || 'Your account'}
                      </h1>
                      <p className="mt-2 text-sm text-slate-400">{session.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900">
                      <Link href="/editor">Open editor</Link>
                    </Button>
                    <Button asChild className="bg-blue-600 text-white hover:bg-blue-500">
                      <Link href="/assets">Manage assets</Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {[
                    { label: 'API keys', value: apiKeyCount },
                    { label: 'Connected services', value: connectedCount },
                    { label: 'Available integrations', value: availableIntegrations },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3"
                    >
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-50">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Card className={sectionCardClass}>
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-slate-100">Setup status</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="font-medium text-slate-100">Token storage</div>
                      <p className="mt-1 text-slate-400">
                        Provider tokens and personal API keys are encrypted before they are stored.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="font-medium text-slate-100">Cloud access</div>
                      <p className="mt-1 text-slate-400">
                        Google Drive and Dropbox appear in the Assets workspace once their OAuth keys are configured.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="font-medium text-slate-100">R2 storage</div>
                      <p className="mt-1 text-slate-400">
                        Cloudflare R2 is documented for deployment, but it is still a planned asset-storage integration.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {renderNotice(activeNotice)}

            <Tabs defaultValue="profile" className="space-y-5">
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5">
                <TabsTrigger value="profile" className={tabTriggerClass}>
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="api-keys" className={tabTriggerClass}>
                  <Key className="h-4 w-4" />
                  API Keys
                </TabsTrigger>
                <TabsTrigger value="connections" className={tabTriggerClass}>
                  <Link2 className="h-4 w-4" />
                  Connections
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="m-0">
                <Card className={sectionCardClass}>
                  <CardHeader>
                    <CardTitle>Profile information</CardTitle>
                    <CardDescription className="text-slate-400">
                      Update the name shown across the ReelForge workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border border-slate-700 bg-slate-900">
                          <AvatarFallback className="bg-slate-900 text-xl text-slate-100">
                            {getInitials(session.user?.name || session.user?.email || 'RF')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-100">{session.user?.email}</p>
                          <p className="mt-1 text-sm text-slate-400">Your avatar fallback is generated from your name.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                        <div className="font-medium text-slate-100">Quick access</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900">
                            <Link href="/assets">Asset workspace</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900">
                            <Link href="/editor/github">GitHub browser</Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-800" />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                          <label htmlFor="account-display-name" className="text-sm font-medium text-slate-200">
                            Display name
                          </label>
                          <Input
                            id="account-display-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Your name"
                          className="border-slate-700 bg-slate-950/80 text-slate-100"
                        />
                      </div>

                      <div className="space-y-2">
                          <label htmlFor="account-email" className="text-sm font-medium text-slate-200">
                            Email
                          </label>
                          <Input
                            id="account-email"
                            value={session.user?.email || ''}
                            disabled
                            className="border-slate-700 bg-slate-900/80 text-slate-400"
                        />
                        <p className="text-xs text-slate-500">Email addresses are managed by your authentication provider.</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save changes'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api-keys" className="m-0">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className={sectionCardClass}>
                    <CardHeader>
                      <CardTitle>LLM provider keys</CardTitle>
                      <CardDescription className="text-slate-400">
                        Add the provider keys you want ReelForge to use for AI-assisted tasks.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label htmlFor="account-api-provider" className="text-sm font-medium text-slate-200">
                              Provider
                            </label>
                            <select
                              id="account-api-provider"
                              value={newApiKeyProvider}
                              onChange={(event) => setNewApiKeyProvider(event.target.value)}
                              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                            >
                              <option value="openai">OpenAI</option>
                              <option value="anthropic">Anthropic</option>
                              <option value="openrouter">OpenRouter</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="account-api-label" className="text-sm font-medium text-slate-200">
                              Label
                            </label>
                            <Input
                              id="account-api-label"
                              value={newApiKeyName}
                              onChange={(event) => setNewApiKeyName(event.target.value)}
                              placeholder="e.g. Production"
                              className="border-slate-700 bg-slate-950/80 text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <label htmlFor="account-api-key" className="text-sm font-medium text-slate-200">
                            API key
                          </label>
                          <Input
                            id="account-api-key"
                            type="password"
                            value={newApiKey}
                            onChange={(event) => setNewApiKey(event.target.value)}
                            placeholder="Paste your provider secret"
                            className="border-slate-700 bg-slate-950/80 text-slate-100"
                          />
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button onClick={handleAddApiKey} disabled={addingKey || !newApiKey.trim()}>
                            {addingKey ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Add API key
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {apiKeys.length > 0 ? (
                        <div className="space-y-3">
                          {apiKeys.map((key) => (
                            <div
                              key={key.id}
                              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-100">{PROVIDER_NAMES[key.provider] || key.provider}</p>
                                    {key.isDefault && (
                                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-200">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  {key.name && <p className="mt-1 text-sm text-slate-400">{key.name}</p>}
                                  <p className="mt-2 text-xs text-slate-500">
                                    Added {new Date(key.createdAt).toLocaleDateString()}
                                    {key.lastUsedAt ? ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ''}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {!key.isDefault && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900"
                                      onClick={() => handleSetDefault(key.id, key.provider)}
                                    >
                                      Set as default
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-rose-500/30 bg-transparent text-rose-200 hover:bg-rose-500/10"
                                    onClick={() => handleDeleteApiKey(key.id, key.provider)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/55 px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-slate-100">No API keys added yet</p>
                          <p className="mt-2 text-sm text-slate-400">
                            Add a provider key above to enable AI-assisted generation flows.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={sectionCardClass}>
                    <CardHeader>
                      <CardTitle>Storage and security</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-300">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="font-medium text-slate-100">Encrypted at rest</p>
                        <p className="mt-1 text-slate-400">
                          Saved API keys and provider tokens are encrypted before they are written to the database.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="font-medium text-slate-100">Provider-specific defaults</p>
                        <p className="mt-1 text-slate-400">
                          The default button selects which key ReelForge should prefer for that provider.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="connections" className="m-0">
                <div className="grid gap-4 xl:grid-cols-3">
                  {CONNECTIONS.map((config) => renderConnectionCard(config))}

                  <Card className={sectionCardClass}>
                    <CardContent className="p-5">
                      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-orange-400/20 to-yellow-300/10 px-3 py-2 text-sm font-semibold text-orange-100">
                        Cloudflare R2
                      </div>
                      <p className="mt-4 text-sm text-slate-300">
                        R2 is the planned shared object-storage backend for uploaded assets and delivery, but there is no account-level connect flow for it yet.
                      </p>
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Expected environment keys</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT'].map((key) => (
                            <span
                              key={key}
                              className="rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900">
                          <Link href="/assets">
                            Open assets
                            <Upload className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
