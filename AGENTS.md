# Agent Instructions

## Node / npm

The host machine does not have an up-to-date Node.js installation.
**Always run Node and npm commands inside a Docker container** using a recent official Node image.

Use the following pattern for any `node` or `npm` command:

```bash
docker run --rm -it \
  -v "$(pwd)":/app \
  -w /app \
  node:lts \
  npm <command>
```

Examples:

```bash
# Install dependencies
docker run --rm -it -v "$(pwd)":/app -w /app node:lts npm install

# Run a script
docker run --rm -it -v "$(pwd)":/app -w /app node:lts npm run build

# Run an arbitrary node script
docker run --rm -it -v "$(pwd)":/app -w /app node:lts node script.js
```

> **Note:** Replace `node:lts` with a specific version tag (e.g. `node:22`) if the project requires a pinned version.
