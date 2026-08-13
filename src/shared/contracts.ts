export type InputKind = "txt" | "xlsx"
export type RuntimePlatform = "desktop" | "web"

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
  platform: RuntimePlatform
}

export interface QrAppApi {
  getAppInfo: () => Promise<AppInfo>
  selectFiles: () => Promise<InputFile[]>
  describeDroppedFiles: (files: File[]) => Promise<InputFile[]>
  selectOutputDirectory: () => Promise<string | undefined>
  generate: (request: GenerateRequest) => Promise<GenerationSummary>
  openOutputDirectory: (directory: string) => Promise<void>
  revealFile: (filePath: string) => Promise<void>
  checkForUpdates: () => Promise<UpdateState>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  onGenerationProgress: (
    callback: (progress: GenerationProgress) => void,
  ) => () => void
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
}
