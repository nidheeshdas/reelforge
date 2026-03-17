import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      "**/.open-next/**",
      ".wrangler/**",
      "**/.wrangler/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "cloudflare/worker-configuration.d.ts",
      "cloudflare/render-worker/worker-configuration.d.ts",
      "src/parser/grammar/parser.js",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
