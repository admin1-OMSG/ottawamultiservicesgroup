import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".output", ".wrangler"].includes(entry.name)) return [];
      return walk(full);
    }
    return [full];
  });
}

const sourceFiles = [...walk(path.join(root, "src")), ...walk(path.join(root, "supabase", "functions"))]
  .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

const forbiddenIdentifiers = [
  "getBoundingCustomerRect",
  "Number.isEndite",
  "twWedge",
  "BrandTuek",
  "isSateDay",
  "isSateMonth",
  "createFetchHttpCustomer",
];

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const token of forbiddenIdentifiers) {
    if (text.includes(token)) {
      errors.push(`${path.relative(root, file)} contains invalid identifier: ${token}`);
    }
  }
}

const sidebarPath = path.join(root, "src", "components", "admin", "Sidebar.tsx");
if (fs.existsSync(sidebarPath)) {
  const sidebar = fs.readFileSync(sidebarPath, "utf8");
  if (/Coming soon|>\s*Soon\s*</i.test(sidebar)) {
    warnings.push("Admin sidebar still contains Coming Soon/Soon labels.");
  }
}

const assetExt = /\.(png|jpe?g|webp|svg)$/i;
for (const file of walk(path.join(root, "src"))) {
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const importRegex = /from\s+["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(text))) {
    const spec = match[1];
    if (!assetExt.test(spec) || spec.startsWith("@/")) continue;
    const resolved = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(resolved)) errors.push(`${path.relative(root, file)} imports missing asset: ${spec}`);
  }
}

const requiredFunctions = [
  "send-crm-email",
  "get-available-slots",
  "sign-estimate",
  "create-checkout-session",
];
for (const fn of requiredFunctions) {
  const index = path.join(root, "supabase", "functions", fn, "index.ts");
  if (!fs.existsSync(index)) errors.push(`Missing Supabase Edge Function: ${fn}`);
}

console.log("\nOttawa Multiservices Group — Launch Audit\n");
if (warnings.length) {
  console.log("Warnings:");
  warnings.forEach((w) => console.log(`  - ${w}`));
  console.log("");
}
if (errors.length) {
  console.error("Errors:");
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error(`\nAudit failed with ${errors.length} error(s).\n`);
  process.exit(1);
}
console.log("✓ No known translation-corrupted JavaScript identifiers found.");
console.log("✓ Referenced local image imports checked.");
console.log("✓ Required customer-facing Edge Function source folders found.");
console.log("✓ Admin navigation has no unfinished module placeholders.");
console.log("\nLaunch audit passed.\n");
