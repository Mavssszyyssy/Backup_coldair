/*
 * Ensures every local import resolves with its exact on-disk casing. This is
 * important because Windows is case-insensitive while GitHub's Linux runners
 * are not.
 */
const fs = require("fs");
const path = require("path");
const { builtinModules } = require("module");

const repositoryRoot = path.resolve(__dirname, "..");
const sourceRoots = [
  { directory: path.join(repositoryRoot, "front", "src"), packageDirectory: path.join(repositoryRoot, "front") },
  { directory: path.join(repositoryRoot, "backend", "src"), packageDirectory: path.join(repositoryRoot, "backend") },
];
const extensions = ["", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".png", ".jpg", ".jpeg", ".svg"];
const indexExtensions = [".js", ".jsx", ".mjs", ".cjs", ".json"];
const builtins = new Set(builtinModules.concat(builtinModules.map((name) => `node:${name}`)));

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(entryPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : [];
  });
}

function getImports(source) {
  const requests = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) requests.push(match[1]);
  }
  return requests;
}

function resolveIgnoringCase(candidate) {
  const absoluteCandidate = path.resolve(candidate);
  const relativeCandidate = path.relative(repositoryRoot, absoluteCandidate);
  if (relativeCandidate.startsWith("..") || path.isAbsolute(relativeCandidate)) return null;

  let current = repositoryRoot;
  const mismatches = [];

  for (const segment of relativeCandidate.split(path.sep)) {
    if (!segment) continue;
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) return null;
    const exact = fs.readdirSync(current).find((name) => name === segment);
    const actual = exact || fs.readdirSync(current).find((name) => name.toLowerCase() === segment.toLowerCase());
    if (!actual) return null;
    if (actual !== segment) mismatches.push({ expected: segment, actual });
    current = path.join(current, actual);
  }

  return { path: current, mismatches };
}

function resolveLocalImport(filePath, request) {
  const base = path.resolve(path.dirname(filePath), request);
  const candidates = [
    ...extensions.map((extension) => `${base}${extension}`),
    ...indexExtensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.map(resolveIgnoringCase).find(Boolean) || null;
}

function packageName(request) {
  return request.startsWith("@") ? request.split("/").slice(0, 2).join("/") : request.split("/")[0];
}

const errors = [];
for (const { directory, packageDirectory } of sourceRoots) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"));
  const declaredDependencies = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
    ...Object.keys(packageJson.optionalDependencies || {}),
  ]);

  for (const filePath of getSourceFiles(directory)) {
    for (const request of getImports(fs.readFileSync(filePath, "utf8"))) {
      const displayPath = path.relative(repositoryRoot, filePath);
      if (request.startsWith(".")) {
        const resolved = resolveLocalImport(filePath, request);
        if (!resolved) {
          errors.push(`${displayPath}: cannot resolve ${request}`);
        } else if (resolved.mismatches.length > 0) {
          const details = resolved.mismatches.map(({ expected, actual }) => `${expected} (actual: ${actual})`).join(", ");
          errors.push(`${displayPath}: import casing does not match ${request}: ${details}`);
        }
      } else if (!builtins.has(request) && !declaredDependencies.has(packageName(request))) {
        errors.push(`${displayPath}: ${packageName(request)} is imported but is not declared in ${path.relative(repositoryRoot, packageDirectory)}/package.json`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Import validation failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Import validation passed.");
