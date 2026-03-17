import path from 'node:path';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const isCloudflareBuild = process.env.NEXT_CLOUDFLARE === '1';
const cloudflareBuildTurbopackAliases = isCloudflareBuild
  ? {
      '@/lib/queue': '@/lib/queue/cloudflare-stub',
      '@/render/webgl-renderer': '@/render/webgl-renderer.cloudflare',
    }
  : {};
const cloudflareBuildWebpackAliases = isCloudflareBuild
  ? {
      '@/lib/queue': path.join(process.cwd(), 'src/lib/queue/cloudflare-stub.ts'),
      '@/render/webgl-renderer': path.join(process.cwd(), 'src/render/webgl-renderer.cloudflare.ts'),
    }
  : {};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['canvas', 'gl'],
  turbopack: {
    resolveAlias: cloudflareBuildTurbopackAliases,
  },
  webpack: (config, { isServer }) => {
    if (isCloudflareBuild && isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        ...cloudflareBuildWebpackAliases,
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
