# Repository guide

## Commands

- `bun install`: instala as dependências do projeto.
- `bun run dev`: executa o aplicativo Electron em modo de desenvolvimento.
- `bun run dev:web`: executa o alvo para navegador/PWA em modo de desenvolvimento.
- `bun run check`: executa lint, verificação de tipos, testes e builds do Electron e da PWA.
- `bun run build:web`: gera a PWA instalável em `dist-web`.
- `bun run package:win`: gera o instalador NSIS para Windows.
- `bun run package:store`: gera um MSIX sem assinatura para envio à Microsoft Store.

## Architecture boundaries

- Keep filesystem, dialogs, QR generation and updater code in `src/main`.
- Keep parsing rules shared in `src/shared`; browser-specific generation belongs in `src/renderer/src/platform`.
- Keep the renderer browser-only. Never enable Node integration.
- Expose only narrow, typed operations from `src/preload/index.ts`.
- Keep IPC payloads serializable and validate untrusted renderer input in main.
- Shared IPC contracts belong in `src/shared/contracts.ts`.

## Product rules

- User-facing text is Brazilian Portuguese.
- Processing must remain local; never upload input files.
- The PWA must produce a local ZIP download and remain usable offline after its first load.
- Preserve TXT and spreadsheet compatibility.
- A GitHub release is incomplete without the installer, blockmap and `latest.yml`.
- Store builds must remain MSIX packages and let Microsoft Store manage updates.
