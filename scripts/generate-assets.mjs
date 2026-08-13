import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import pngToIco from "png-to-ico"
import sharp from "sharp"

const source = resolve("build/icon.svg")
const pngPath = resolve("build/icon.png")
const icoPath = resolve("build/icon.ico")
const msixAssetsPath = resolve("build/msix-assets")
const pwaAssetsPath = resolve("public")

const svg = await readFile(source)
await sharp(svg).resize(512, 512).png().toFile(pngPath)
const ico = await pngToIco(pngPath)
await writeFile(icoPath, ico)

await mkdir(msixAssetsPath, { recursive: true })
await mkdir(pwaAssetsPath, { recursive: true })

const writeMsixAsset = async (name, width, height) => {
  await sharp(svg)
    .resize(width, height, {
      fit: "contain",
      background: { alpha: 0, b: 0, g: 0, r: 0 },
    })
    .png()
    .toFile(resolve(msixAssetsPath, name))
}

await Promise.all([
  writeMsixAsset("icon.png", 50, 50),
  writeMsixAsset("LockScreenLogo.scale-200.png", 48, 48),
  writeMsixAsset("SplashScreen.scale-200.png", 1_240, 600),
  writeMsixAsset("Square44x44Logo.png", 44, 44),
  writeMsixAsset("Square44x44Logo.scale-200.png", 88, 88),
  writeMsixAsset("Square44x44Logo.targetsize-24_altform-unplated.png", 24, 24),
  writeMsixAsset("Square150x150Logo.png", 150, 150),
  writeMsixAsset("Square150x150Logo.scale-200.png", 300, 300),
  writeMsixAsset("Wide310x150Logo.scale-200.png", 620, 300),
  sharp(svg).resize(192, 192).png().toFile(resolve(pwaAssetsPath, "pwa-192x192.png")),
  sharp(svg).resize(512, 512).png().toFile(resolve(pwaAssetsPath, "pwa-512x512.png")),
  sharp(svg)
    .resize(410, 410, { fit: "contain" })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: "#0b0a12",
    })
    .png()
    .toFile(resolve(pwaAssetsPath, "pwa-maskable-512x512.png")),
])
