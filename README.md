# Mirante QR

Aplicativo desktop para gerar QR codes em lote a partir de planilhas de contatos ou listas de URLs. Todo o processamento acontece localmente no computador.

## Para quem só quer usar

1. Abra a página **Releases** do repositório.
2. Baixe `Mirante-QR-Setup-x.y.z.exe` da versão mais recente.
3. Execute o instalador e abra **Mirante QR** pelo menu Iniciar.
4. Arraste arquivos `.xlsx` ou `.txt` para a janela.
5. Clique em **Gerar QR codes**.

O aplicativo cria uma pasta com os arquivos PNG e um `QR-Codes.zip`. Quando houver uma versão nova, um aviso aparecerá dentro do aplicativo.

> Enquanto o repositório estiver privado, downloads e atualizações pelo GitHub exigem acesso à organização. Torne o repositório público antes da distribuição geral.

## Formatos aceitos

### Planilha

A planilha precisa ter as colunas `Nome` e `Celular`. `Sobrenome` é opcional. O cabeçalho pode estar entre as dez primeiras linhas, e também são reconhecidas as colunas `Telefone` e `WhatsApp`.

| Nome | Sobrenome | Celular         |
| ---- | --------- | --------------- |
| Ana  | Lima      | (11) 99999-0000 |

O código do país `55` é incluído automaticamente quando necessário.

### TXT

Use uma URL por linha. Linhas vazias e linhas iniciadas por `#` são ignoradas.

```text
https://example.com/evento
backstagemirante.com/visita
# comentário
```

## Desenvolvimento

Requisitos: Node.js 24 LTS e npm.

```bash
npm ci
npm run dev
```

Verificação completa:

```bash
npm run check
```

Empacotamento Windows:

```bash
npm run package:win
```

## Publicar uma versão

1. Abra **Actions → Publicar versão para Windows → Run workflow**.
2. Informe a nova versão sem `v`, por exemplo `1.1.0`.
3. O workflow valida o projeto, gera o instalador, cria o commit/tag e publica a Release.

A versão precisa ser maior que a atual. O instalador, seu blockmap e `latest.yml` são publicados juntos para que o atualizador funcione.

## Arquitetura

- Electron: janela, sistema de arquivos, integração com Windows e atualizações.
- React + TypeScript + Vite: interface.
- shadcn/ui + Base UI: componentes acessíveis com o preset `b3a1Kd26S0`.
- `read-excel-file`: leitura segura de planilhas XLSX.
- `qrcode`: geração dos PNGs.
- `jszip`: criação do pacote ZIP.
- `electron-builder` + NSIS: instalador `.exe`.
- `electron-updater`: atualizações via GitHub Releases.

O renderer não tem acesso direto ao Node.js. As operações privilegiadas passam por uma API mínima no preload, com `sandbox`, `contextIsolation` e `nodeIntegration: false`.

## Assinatura do Windows

Os builds são reproduzíveis, mas inicialmente não são assinados. O Windows pode mostrar o aviso “Editor desconhecido”. Para uma distribuição sem esse alerta, configure posteriormente um certificado de assinatura de código ou Azure Trusted Signing nos secrets do repositório.
