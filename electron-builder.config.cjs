const requiredSigningValue = (name) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`A publicação assinada requer a variável ${name}.`)
  }

  return value
}

const signingRequired = process.env.REQUIRE_WINDOWS_SIGNING === "true"

const azureSignOptions = signingRequired
  ? {
      endpoint: requiredSigningValue("AZURE_SIGNING_ENDPOINT"),
      codeSigningAccountName: requiredSigningValue(
        "AZURE_CODE_SIGNING_ACCOUNT_NAME",
      ),
      certificateProfileName: requiredSigningValue(
        "AZURE_CERTIFICATE_PROFILE_NAME",
      ),
      publisherName: requiredSigningValue("AZURE_PUBLISHER_NAME"),
    }
  : undefined

const windowsConfiguration = {
  target: [
    {
      target: "nsis",
      arch: ["x64"],
    },
  ],
  icon: "build/icon.ico",
  artifactName: "Mirante-QR-Setup-${version}.${ext}",
}

if (azureSignOptions) {
  windowsConfiguration.azureSignOptions = azureSignOptions
}

module.exports = {
  appId: "com.backstagemirante.qrcode",
  productName: "Mirante QR",
  asar: true,
  compression: "maximum",
  electronLanguages: ["pt-BR", "en-US"],
  forceCodeSigning: signingRequired,
  directories: {
    buildResources: "build",
    output: "release",
  },
  files: ["out/**/*", "package.json"],
  extraResources: [
    {
      from: "build/icon.png",
      to: "icon.png",
    },
  ],
  win: windowsConfiguration,
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: "always",
    createStartMenuShortcut: true,
    shortcutName: "Mirante QR",
    perMachine: false,
    deleteAppDataOnUninstall: false,
  },
  publish: {
    provider: "github",
    owner: "backstage-mirante",
    repo: "scripts-gerar-qrcode",
    releaseType: "release",
  },
}
