# Farkle

A 3D web implementation of the classic dice game Farkle.

## Features

-   **3D Dice Rolling**: Realistic dice physics and rendering using Three.js.
-   **Game Logic**: Complete implementation of Farkle rules.
-   **Responsive Design**: Playable on various screen sizes.

## Tech Stack

-   [TypeScript](https://www.typescriptlang.org/)
-   [Vite](https://vitejs.dev/)
-   [Three.js](https://threejs.org/)

## Getting Started

### Prerequisites

-   Node.js
-   npm

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/joecarl/farkle.git
    ```
2. Navigate to the project directory:
    ```bash
    cd farkle
    ```
3. Install dependencies:
    ```bash
    npm install
    ```

### Development

To start the development server:

```bash
npm run dev
```

### Build

To build for production:

```bash
npm run build
```

The project is configured with `base: './'` in `vite.config.ts`, which allows the built application (in the `dist` folder) to be deployed to any subdirectory or the root of a domain without further configuration.

### Nginx

Si servimos la web a través de nginx, este sería un modelo para configurar el proxy.
En este ejemplo se publica bajo el path `/farkle/` y se hace proxy interno al puerto `50051`

```
# Para evitar el cacheo de la pagina principal
location = /farkle/ {
	proxy_pass http://localhost:50051/;

	add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
	add_header Pragma "no-cache" always;
	add_header Expires 0 always;
}
# Para soporte de WebSocket
location /farkle/ {
	proxy_pass http://localhost:50051/;
	proxy_http_version 1.1;
	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
	proxy_read_timeout 86400;
}
```
