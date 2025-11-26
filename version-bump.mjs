import { readFileSync, writeFileSync } from "fs";

// Get version from package.json if npm_package_version is not set
let targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  targetVersion = packageJson.version;
}

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("src/manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("src/manifest.json", JSON.stringify(manifest, null, "\t"));
// Also update root manifest.json (required for Obsidian validation)
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
