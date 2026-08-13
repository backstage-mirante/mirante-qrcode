# Repository guide

## Commands

- `npm run dev`: run the Electron app in development mode.
- `npm run check`: lint, typecheck, test and production-build.
- `npm run package:win`: build the NSIS Windows installer.
- `npm run package:store`: build an unsigned MSIX for Microsoft Store ingestion.

## Architecture boundaries

- Keep filesystem, dialogs, QR generation and updater code in `src/main`.
- Keep the renderer browser-only. Never enable Node integration.
- Expose only narrow, typed operations from `src/preload/index.ts`.
- Keep IPC payloads serializable and validate untrusted renderer input in main.
- Shared IPC contracts belong in `src/shared/contracts.ts`.

## Product rules

- User-facing text is Brazilian Portuguese.
- Processing must remain local; never upload input files.
- Preserve TXT and spreadsheet compatibility.
- A GitHub release is incomplete without the installer, blockmap and `latest.yml`.
- Store builds must remain MSIX packages and let Microsoft Store manage updates.
