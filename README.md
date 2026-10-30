# Logscope

A browser-based React log viewer. Files are read locally in the browser; the app does not send their contents to a server.

## Run locally

```sh
npm install
npm run dev
```

To make a production bundle, run `npm run build`.

Upload or drop plain-text log files such as `.log`, `.txt`, `.json`, `.jsonl`, `.csv`, and `.out`. The viewer keeps each line intact, highlights common severity terms, and renders ANSI terminal color codes. Search, severity filters, wrapping, clipboard copy, and downloading are available in the viewer. Files without ANSI codes or exported styling metadata cannot carry their original Chrome DevTools colors; severity colors are inferred from recognizable words.
