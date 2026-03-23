const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const root = path.join(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bizprint-mcpb-"));

try {
  const entries = [
    "dist",
    "node_modules",
    "manifest.json",
    "package.json",
    "package-lock.json",
    "icon.png",
    "LICENSE",
    "README.md",
  ];

  console.log("Copying files to temp directory...");
  for (const entry of entries) {
    const src = path.join(root, entry);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(tmp, entry);
    fs.cpSync(src, dest, { recursive: true });
  }

  // Remove local tool caches before pruning
  const cacheDirs = [".vite", ".cache"];
  for (const dir of cacheDirs) {
    const p = path.join(tmp, "node_modules", dir);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  }

  console.log("Pruning dev dependencies in temp copy...");
  execSync("npm prune --omit=dev", { cwd: tmp, stdio: "inherit" });

  const mcpbBin = path.join(root, "node_modules", ".bin", "mcpb");
  console.log("Packing MCPB bundle...");
  execSync(`"${mcpbBin}" pack`, { cwd: tmp, stdio: "inherit" });

  // Move the generated .mcpb file to the repo root
  const mcpbFiles = fs.readdirSync(tmp).filter((f) => f.endsWith(".mcpb"));
  if (mcpbFiles.length === 0) {
    throw new Error("No .mcpb file was generated");
  }

  const outputName = "bizprint-mcp-server.mcpb";
  fs.copyFileSync(path.join(tmp, mcpbFiles[0]), path.join(root, outputName));
  console.log(`\nOutput: ${path.join(root, outputName)}`);
  console.log("Working tree was not modified.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
