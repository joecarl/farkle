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
