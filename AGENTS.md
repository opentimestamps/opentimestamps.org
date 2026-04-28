# Repository Guidelines

## Project Structure & Module Organization
This repository is a static website for `opentimestamps.org`. The main page lives in `index.html`. Source styles live under `assets/stylesheets/`, with page-level Sass split into `application/`, `timestamp-of/`, `helpers/`, and `shared/`. Source JavaScript lives in `assets/javascripts/application/`, while third-party libraries are kept in `assets/javascripts/vendor/` and `assets/javascripts/crypto-js/`. Images and icons are under `assets/images/`.

Compiled assets are written to `assets/stylesheets/application.css`, `assets/stylesheets/timestamp-of.css`, and `assets/javascripts/application.js`. Treat those as build outputs: edit the Sass or source JS, not the generated bundles. These generated files are currently tracked in Git, so rebuild them before committing source changes that affect frontend output.

## Build, Test, and Development Commands
Enter the Nix development shell first:

```sh
nix develop
```

Install dependencies with:

```sh
npm install --include=dev
```

Build CSS and JavaScript bundles with:

```sh
npx gulp
```

Run individual build steps when needed:

```sh
npm run sass
npm run coffee
```

Start a local static server with:

```sh
npx gulp server
# or
npm start
```

Use `npm run watch` while editing Sass or application JavaScript.

## Coding Style & Naming Conventions
Follow the existing style in the repo: two-space indentation in JavaScript and simple, flat Sass partials. Keep JavaScript compatible with the current jQuery-based frontend; prefer small functions in `assets/javascripts/application/`. Use kebab-case for file names such as `toggleMenu.js` only when matching the existing naming; otherwise preserve the current patterns already in the folder. Keep Sass partials focused by section, for example `application/navigation.scss`.

## Testing Guidelines
There is no automated test suite in this repository. Verify changes by rebuilding assets, starting the local server, and manually checking affected flows in the browser, especially stamp/verify interactions on `index.html`, responsive navigation, and any asset path changes. If frontend sources change, include the regenerated tracked assets in the same commit only after a successful rebuild.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `add plausible`, `update zoho link`, and `make site static`. Keep commit messages concise and specific to one change. Pull requests should include a brief description, manual verification steps, and screenshots for visual updates. Link related issues when applicable and call out any regenerated assets included in the diff.
