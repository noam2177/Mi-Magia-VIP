import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPERATOR_NOTIFY_EMAIL",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "OPERATOR_BIT_LINK",
];

const recommended = ["OPERATOR_BIT_PHONE", "PUBLIC_SITE_URL"];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const fileEnv = loadEnvFile(envPath);
const merged = { ...fileEnv, ...process.env };

const missing = required.filter((k) => !merged[k]?.trim());
const weak = recommended.filter((k) => !merged[k]?.trim());

if (!existsSync(envPath)) {
  console.warn("warn: .env not found — checking process.env only (OK on Lovable deploy)");
}

if (missing.length) {
  console.error("Missing required env for launch:");
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}

if (weak.length) {
  console.warn("Recommended before production smoke test:");
  for (const k of weak) console.warn(`  - ${k}`);
}

console.log("verify:launch OK — required env present.");
