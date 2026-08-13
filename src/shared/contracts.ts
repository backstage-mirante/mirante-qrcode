export type InputKind = "txt" | "xlsx"

export interface InputFile {
  path: string
  name: string
  size: number
  kind: InputKind
}

export interface GenerateRequest {
  paths: string[]
  outputRoot?: string
}

export interface GeneratedQrCode {
  id: string
  filename: string
  filePath: string
  sourceFile: string
  encodedValue: string
  previewDataUrl: string
}

export interface GenerationWarning {
  sourceFile: string
  message: string
}

export interface GenerationSummary {
  outputDirectory: string
  zipPath: string
  items: GeneratedQrCode[]
  warnings: GenerationWarning[]
}

export interface GenerationProgress {
  completed: number
  total: number
  message: string
}

export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "not-available" }
  | { status: "downloading"; percent: number }
  | { status: "downloaded"; version: string }
  | { status: "error"; message: string }

export interface AppInfo {
  version: string
  packaged: boolean
  defaultOutputDirectory: string
}
