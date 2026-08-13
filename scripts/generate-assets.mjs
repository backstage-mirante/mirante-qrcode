import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import pngToIco from "png-to-ico"
import sharp from "sharp"

const source = resolve("build/icon.svg")
const pngPath = resolve("build/icon.png")
const icoPath = resolve("build/icon.ico")

const svg = await readFile(source)
await sharp(svg).resize(512, 512).png().toFile(pngPath)
const ico = await pngToIco(pngPath)
await writeFile(icoPath, ico)
