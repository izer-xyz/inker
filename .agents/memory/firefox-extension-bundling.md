---
name: Firefox extension bundling
description: How runtime dependencies must be packaged for this Firefox WebExtension.
---

Firefox content scripts cannot resolve npm packages at runtime. Any dependency used by the extension must be converted to a browser-compatible classic script, loaded before the dependent content script, and included in the ZIP.

**Why:** The extension directory is not a pnpm workspace package and Firefox does not provide Node module resolution inside content scripts.

**How to apply:** Keep the npm dependency in the workspace package metadata, generate the browser file during packaging, list it before dependent scripts in the manifest, and verify the embedded ZIP files directly.