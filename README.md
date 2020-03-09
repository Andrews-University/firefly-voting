# Firefly

Firefly is a real-time audience polling system. It is composed of three web-applications: A voting client to be used by audience members, a real-time monitor for overhead projection of voting results, and an administrative interface to open and close voting and switch between categories.

## Features

* Image voting
* Unlimited categories
* Unlimited candidates
* Separate voting and monitor interfaces
* Suitable for static hosting (on a CDN for example)

## Limitations

* Categories and candidates are not dynamic and must be compiled ahead of time
* No authentication on individual votes or voters
* Text must be rendered to image, for voting
* Single-process using SQLite limits the capacity of the server


## Configuring

There are placeholder shared-secrets in `/config.ts`. Users are encouraged to regenerate these values to avoid unauthorized access to administrative commands.

These strings have no particular format, `uuidgen` was used to generate them due to convenience.

### Building

Both the API server and the clients must be build together, due to code shared between the two packages.

#### API Server

```
yarn install
yarn build
```

#### Clients

```
cd static/
yarn install
yarn build
```

### Running

The API server may be started via:

```
yarn start
```

#### Environment Variables
##### `PORT`
(default: `8080`)

Defines the server's listen port. This server listens on all available interfaces.

##### `BASE_URL`
(default: `""`)

Sets the root directory of the server. This is useful to avoid rewriting URLs when using a reverse-proxy.

##### `SERVE_CLIENTS`
(default: `0`)

When set to a truthy value, the static client applications in `/static` are served by the API server. This is bad for security, unless measures are taken to secure access to `$BASE_URL/admin.html` and `$BASE_URL/monitor.html`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
