import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(repositoryDirectory, ".env");
const exampleFile = path.join(repositoryDirectory, ".env.example");

if (!existsSync(envFile)) {
  copyFileSync(exampleFile, envFile, 1);
  console.log(
    "Created .env from the local development example. The demo account can be used for local sign-in after seeding.",
  );
}
