# Logscope

A browser-based React log viewer. Files are read locally in the browser; the app does not send their contents to a server.

## Live demo

[Try Logscope](https://logscope.netlify.app/)

## Run locally

```sh
npm install
npm run dev
```

To make a production bundle, run `npm run build`.

Upload or drop plain-text log files such as `.log`, `.txt`, `.json`, `.jsonl`, `.csv`, and `.out`. The viewer keeps each line intact, highlights common severity terms, and renders ANSI terminal color codes. Search, severity filters, wrapping, clipboard copy, and downloading are available in the viewer. Files without ANSI codes or exported styling metadata cannot carry their original Chrome DevTools colors; severity colors are inferred from recognizable words.

## Mobile support

The layout supports phones and tablets: the header menu opens the file list, editors stack vertically, and HAR request and comparison panels adapt to narrow screens. New phone sessions start with a readable 16px text size; saved text-size preferences are retained.

## Project structure

- `src/App.tsx` coordinates the shared layout, selected tool, and file uploads.
- `src/components/` contains layout components and shared controls.
- `src/features/console/`, `src/features/json/`, and `src/features/har/` own each tool's UI and state.
- `src/i18n/locales/` contains separate English, Bengali, Telugu, Tamil, and Kannada dictionaries. Translation keys are checked by TypeScript; non-English dictionaries load when selected.
- `src/hooks/`, `src/providers/`, and `src/utils/` contain shared state and parsing logic.
- `src/styles/` contains the shared styles; HAR styles load with its inspector.

JSON tools and the HAR inspector load on their first visit and retain their state when switching tabs. Log parsing and ANSI rendering are cached while filtering the active file; HAR searches and statistics are memoized.

Run `npm test` for JSON, log rendering, HAR comparison, and locale checks. Run `npm run build` for TypeScript validation and a production bundle, and `npm run format` to format the source.
