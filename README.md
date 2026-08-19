# Mirante QR

Aplicativo desktop para gerar QR codes em lote a partir de planilhas de contatos ou listas de URLs. Todo o processamento acontece localmente no computador.

Também há uma versão PWA instalável pelo navegador. Ela mantém o processamento no dispositivo e entrega o lote em um único arquivo ZIP, sem exigir instalador.

## Para quem só quer usar

1. Abra a página **Releases** do repositório.
2. Baixe `Mirante-QR-Setup-x.y.z.exe` da versão mais recente.
3. Execute o instalador e abra **Mirante QR** pelo menu Iniciar.
4. Arraste arquivos `.xlsx` ou `.txt` para a janela.
5. Ou digite as URLs no campo **Digitar URLs**, uma por linha.
6. Clique em **GERAR**.

O aplicativo cria uma pasta com os arquivos PNG e um `QR-Codes.zip`. Quando houver uma versão nova, um aviso aparecerá dentro do aplicativo.

O instalador já inclui tudo que a aplicação precisa. O usuário não precisa instalar Node.js, Python ou qualquer outra dependência.

> Enquanto o repositório estiver privado, downloads e atualizações pelo GitHub exigem acesso à organização. Torne o repositório público antes da distribuição geral.

## Usar pelo navegador

1. Abra a URL publicada pela Vercel no Microsoft Edge ou Google Chrome.
2. Clique em **Instalar aplicativo**. Se o navegador ainda não exibir a opção, use o menu e escolha **Instalar Mirante QR**.
3. Adicione arquivos `.xlsx` ou `.txt`.
4. Ou digite as URLs no campo **Digitar URLs**, uma por linha.
5. Clique em **GERAR** para baixar `QR-Codes_data_hora.zip`.

A PWA continua disponível offline depois do primeiro carregamento completo. Arquivos importados e QR codes permanecem no dispositivo; não existe upload para a Vercel.

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

### URLs digitadas

Digite uma URL por linha no campo **Digitar URLs** e clique em **GERAR**.

As regras são as mesmas do arquivo TXT: linhas vazias e linhas iniciadas por `#` são ignoradas, e o limite é de 500 URLs por lote.

O nome de cada arquivo PNG vem da URL normalizada; por exemplo, `https://www.example.com/evento` gera `example.com-evento.png`.

Os avisos indicam a linha de cada URL inválida ou maior que 2048 caracteres, contada a partir da primeira linha digitada.

## Desenvolvimento

Node.js 24 e npm são requisitos somente para desenvolvimento, nunca para quem instala a aplicação.

```bash
npm ci
npm run dev
```

Desenvolvimento da PWA:

```bash
npm run dev:web
```

Verificação completa:

```bash
npm run check
```

## Publicar a PWA na Vercel

1. Importe `backstage-mirante/mirante-qrcode` como um projeto na Vercel.
2. Mantenha o diretório raiz do repositório.
3. A Vercel lerá `vercel.json`, executará `npm run build:web` e publicará `dist-web`.
4. Vincule o domínio desejado quando o primeiro deploy estiver validado.

Cada push na branch de produção gera uma versão nova. O Service Worker atualiza os arquivos do aplicativo automaticamente; os dados de entrada não passam pelos servidores da Vercel.

Empacotamento Windows:

```bash
npm run package:win
```

## Publicar uma versão

1. Abra **Actions → Publicar versão para Windows → Run workflow**.
2. Informe a nova versão sem `v`, por exemplo `1.1.0`.
3. O workflow valida o projeto, gera o instalador, cria o commit/tag e publica a Release.

A versão precisa ser maior que a atual. O instalador, seu blockmap e `latest.yml` são publicados juntos para que o atualizador funcione.

A primeira versão `1.0.0` é publicada automaticamente quando o projeto é inicializado. Pushes posteriores não repetem uma versão que já possua tag.

## Publicar pela Microsoft Store

A Microsoft Store é o canal recomendado para computadores com Smart App Control. A Microsoft valida e assina o pacote aprovado, e o Windows instala as atualizações pela própria Store. Não distribua diretamente o MSIX sem assinatura gerado pelo workflow: ele existe apenas para envio ao Partner Center.

1. Crie a conta de desenvolvedor da organização no [Partner Center](https://partner.microsoft.com/dashboard) e reserve o nome **Mirante QR**.
2. Em **Product identity**, copie exatamente os valores **Package/Identity/Name**, **Publisher** e **Publisher display name**.
3. Em **Settings → Secrets and variables → Actions → Variables** deste repositório, crie:
   - `STORE_PACKAGE_IDENTITY`
   - `STORE_PUBLISHER`
   - `STORE_PUBLISHER_DISPLAY_NAME`
4. Abra **Actions → Preparar pacote para Microsoft Store → Run workflow**.
5. Baixe o artefato `microsoft-store-msix-*` e envie o arquivo `.msix` na submissão do aplicativo no Partner Center.

O pacote da Store não usa `electron-updater`, porque misturar o atualizador do GitHub com o gerenciamento da Store pode quebrar a instalação. A versão `.exe` continua usando as Releases do GitHub normalmente.

## Arquitetura

- Electron: janela, sistema de arquivos, integração com Windows e atualizações.
- React + TypeScript + Vite: interface.
- shadcn/ui + Base UI: componentes acessíveis com o preset `b3a1Kd26S0`.
- `read-excel-file`: leitura segura de planilhas XLSX.
- `qrcode`: geração dos PNGs.
- `jszip`: criação do pacote ZIP.
- `electron-builder` + NSIS: instalador `.exe`.
- `electron-updater`: atualizações via GitHub Releases.
- `electron-windows-msix`: pacote de ingestão da Microsoft Store.

O renderer não tem acesso direto ao Node.js. As operações privilegiadas passam por uma API mínima no preload, com `sandbox`, `contextIsolation` e `nodeIntegration: false`.

## Assinatura do Windows

O workflow de Release permite publicação sem assinatura enquanto `REQUIRE_WINDOWS_SIGNING` não estiver habilitada. Esses instaladores podem ser bloqueados pelo Smart App Control. Para exigir assinatura Authenticode via Microsoft Azure Artifact Signing, configure a Variable `REQUIRE_WINDOWS_SIGNING` como `true`; nesse modo, o workflow interrompe a publicação se alguma credencial estiver ausente.

Configure estes **Secrets** do GitHub Actions:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

Configure estas **Variables** do GitHub Actions:

- `REQUIRE_WINDOWS_SIGNING` — use `true` para proibir Releases sem assinatura
- `AZURE_SIGNING_ENDPOINT` — para Brazil South: `https://brs.codesigning.azure.net/`
- `AZURE_CODE_SIGNING_ACCOUNT_NAME`
- `AZURE_CERTIFICATE_PROFILE_NAME`
- `AZURE_PUBLISHER_NAME` — exatamente o Subject emitido no certificado

Use um perfil **Public Trust**. Depois da configuração, publique uma versão nova; uma Release antiga e sem assinatura não pode ser corrigida pelo auto-update.

Quando o repositório estiver público, também é possível solicitar gratuitamente a assinatura pela SignPath Foundation. A aceitação depende dos critérios e da aprovação da fundação, portanto essa alternativa não é automática.

## Tamanho do instalador

As dependências JavaScript são incorporadas ao bundle antes do empacotamento, evitando duplicá-las no instalador. Apenas os idiomas `pt-BR` e `en-US` do Chromium são mantidos. O arquivo da aplicação caiu de aproximadamente 105 MB para menos de 2 MB; o restante é o runtime obrigatório do Electron.
