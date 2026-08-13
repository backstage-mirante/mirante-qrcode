import { access } from "node:fs/promises"
import { resolve } from "node:path"

import { packageMSIX } from "electron-windows-msix"

import packageJson from "../package.json" with { type: "json" }

const requiredValue = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Configuração da Store ausente: ${name}.`)
  if (/[<>&"']/.test(value)) {
    throw new Error(`Configuração da Store inválida: ${name}.`)
  }
  return value
}

const packageIdentity = requiredValue("STORE_PACKAGE_IDENTITY")
const publisher = requiredValue("STORE_PUBLISHER")
const publisherDisplayName = requiredValue("STORE_PUBLISHER_DISPLAY_NAME")

if (!/^[A-Za-z0-9.-]{3,50}$/.test(packageIdentity)) {
  throw new Error("STORE_PACKAGE_IDENTITY não corresponde a uma identidade MSIX válida.")
}
if (!publisher.startsWith("CN=")) {
  throw new Error("STORE_PUBLISHER precisa ser copiado exatamente do Partner Center.")
}

const appDirectory = resolve("release/win-unpacked")
const executable = "Mirante QR.exe"
await access(resolve(appDirectory, executable))

const result = await packageMSIX({
  appDir: appDirectory,
  logLevel: "warn",
  manifestVariables: {
    appDisplayName: "Mirante QR",
    appExecutable: executable,
    packageBackgroundColor: "#0B0A12",
    packageDescription: packageJson.description,
    packageDisplayName: "Mirante QR",
    packageIdentity,
    packageMaxOSVersionTested: "10.0.26100.0",
    packageMinOSVersion: "10.0.19041.0",
    packageVersion: packageJson.version,
    publisher,
    publisherDisplayName,
    targetArch: "x64",
  },
  outputDir: resolve("release-msix"),
  packageAssets: resolve("build/msix-assets"),
  packageName: `Mirante-QR-${packageJson.version}-x64.msix`,
  sign: false,
})

process.stdout.write(`MSIX criado para a Store: ${result.msixPackage}\n`)
