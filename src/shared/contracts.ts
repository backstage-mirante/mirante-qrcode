export type InputKind = "txt" | "xlsx"
export type RuntimePlatform = "desktop" | "web"

export interface SpreadsheetColumnOption {
  index: number
  label: string
}

export interface SpreadsheetHeaderRow {
  index: number
  label: string
  columns: SpreadsheetColumnOption[]
  detectedNameColumn?: number
  detectedLastNameColumn?: number
  detectedPhoneColumn?: number
}

export interface WorksheetColumnMapping {
  headerRow: number
  nameColumn?: number
  lastNameColumn?: number
  phoneColumn?: number
  ignored?: boolean
}

export interface SpreadsheetSheetAnalysis {
  sheetName: string
  headerRows: SpreadsheetHeaderRow[]
  mapping: WorksheetColumnMapping
  manualMappingRequired: boolean
}

export interface SpreadsheetAnalysis {
  sheets: SpreadsheetSheetAnalysis[]
  error?: string
}

export interface InputFile {
  path: string
  name: string
  size: number
  kind: InputKind
  spreadsheet?: SpreadsheetAnalysis
}

export interface SpreadsheetMappingRequest extends WorksheetColumnMapping {
  path: string
  sheetName: string
}

export interface ManualContact {
  /** Nome informado pelo usuário, sem normalização. */
  name: string
  /** Telefone informado pelo usuário, com ou sem formatação. */
  phone: string
}

export interface GenerateRequest {
  paths: string[]
  /** URLs digitadas pelo usuário, uma por item. */
  urls?: string[]
  /** Contatos digitados pelo usuário, um por item. */
  contacts?: ManualContact[]
  outputRoot?: string
  spreadsheetMappings?: SpreadsheetMappingRequest[]
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
  readClipboardText: () => Promise<string>
  checkForUpdates: () => Promise<UpdateState>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  onGenerationProgress: (
    callback: (progress: GenerationProgress) => void,
  ) => () => void
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
}
