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

## Docker Service Management

When starting a service (e.g., `npm run dev`), always follow these steps:

1.  **Check if the container is already running:**
    ```bash
    docker ps --filter "name=<container_name>"
    ```

2.  **Check if the port is free:**
    ```bash
    netstat -tuln | grep <port>
    ```
    (or generic prompt check if `netstat` is unavailable, but prioritize clean environment).

3.  **If running or port occupied:**
    - Stop the existing container: `docker stop <container_name>`
    - If needed, remove it: `docker rm <container_name>`

4.  **Start the new container:**
    ```bash
    docker run --rm -d -p <port>:<port> --name <container_name> -v "$(pwd)":/app -w /app node:lts npm run dev
    ```
