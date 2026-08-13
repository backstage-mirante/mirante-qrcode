import process from "node:process"

import packageJson from "../package.json" with { type: "json" }

const requested = process.argv[2]
const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

if (!requested || !pattern.test(requested)) {
  throw new Error("Informe uma versão SemVer estável, por exemplo 1.2.0.")
}

if (!pattern.test(packageJson.version)) {
  throw new Error("package.json não contém uma versão válida.")
}
const current = packageJson.version

/** @param {string} left @param {string} right */
const compare = (left, right) => {
  const a = left.split(".").map(Number)
  const b = right.split(".").map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

if (compare(requested, current) <= 0) {
  throw new Error(
    `A nova versão (${requested}) precisa ser maior que ${current}.`,
  )
}

process.stdout.write(`Versão ${requested} validada.\n`)
