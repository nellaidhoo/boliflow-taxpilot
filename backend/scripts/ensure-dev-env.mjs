import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(backendDirectory, ".env");
const exampleFile = path.join(backendDirectory, ".env.example");

if (!existsSync(envFile)) {
  copyFileSync(exampleFile, envFile, 1);
  console.log(
    "Created backend/.env from the local development example. Replace BETTER_AUTH_SECRET before production use.",
  );
}
