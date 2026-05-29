# Agent Instructions

## Node / npm

Node v24.16.0 and npm 11.13.0 are available on the host. Run Node/npm commands directly.

## Python

Python 3.10.12 and uv 0.7.3 are available. Use `uv` for Python dependency management.

## Project Structure

This is a monorepo with the following workspaces:
- `packages/idaztian/` — The editor framework library (npm package)
- `examples/` — Integration examples

The **idatzi** desktop app has been extracted to its own repository: [xezpeleta/idatzi](https://github.com/xezpeleta/idatzi)

## Docker

Docker is available but should only be used when specifically needed (e.g., running services that require isolation).
