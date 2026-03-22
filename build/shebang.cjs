const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "dist", "index.js");
const content = fs.readFileSync(filePath, "utf8");
const shebang = "#!/usr/bin/env node\n";

if (!content.startsWith(shebang)) {
  fs.writeFileSync(filePath, shebang + content);
  fs.chmodSync(filePath, 0o755);
  console.log("Shebang added to dist/index.js");
} else {
  console.log("Shebang already present in dist/index.js");
}
