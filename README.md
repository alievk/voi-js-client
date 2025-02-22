# Voi JS Client
I created this client for testing the Voi backend from the beginning. It has a primitive design, but it gets the job done!

Demo video -> https://www.youtube.com/watch?v=oOYvM61eYNk

## News

- 02/22/2025 - Added user images support.

## Requirements
This app is built on top of [Vue](https://vuejs.org/), but all you need is Docker on your machine.

## Installation
Get the code.
```bash
git clone https://github.com/alievk/voi-js-client.git
cd voi-js-client
```

Set the environment variables.
```bash
cp .env.example .env
```
In `.env`:
- `VUE_APP_WS_HOST` is the host address where the Voi server runs.
- `VUE_APP_WS_PORT` is the port the server listens on.
- `VUE_APP_WS_TOKEN` is the [access token](https://github.com/alievk/voi-server/blob/main/README.md#access-tokens) for the WebSocket connection.
- `VUE_APP_API_KEY` is the [HTTPS API key](https://github.com/alievk/voi-server/blob/main/README.md#environment-variables) (needed to collect server metrics, etc.).
- `VUE_APP_AGENTS_FILE` is the path to a file with the agents.

**Important**: If you use Caddy, the hostname and port must match the ones defined in the `Caddyfile`.

Configure agents.
```bash
cd config
cp agents.example.json agents.json
```
The format is the same as the [server's agents.json](https://github.com/alievk/voi-server/blob/main/README.md#agents), but the control agents are not supported here and must be defined on the server side.

## Run
This will build the Docker container and run a Vue server:
```bash
cd docker
./up.sh
```

When the Vue server is up, go to `https://vue_host_address`. On the first visit, you will see an "unsecure connection" warning, where you have to click on `Proceed`. If you need to get rid of this warning, you have to get a trusted certificate from a service like `Let's Encrypt`.

If you are changing the files, the more reliable way to restart the container is this:
```bash
./down.sh && ./up.sh
```
