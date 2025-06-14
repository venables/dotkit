import { randomBytes } from "node:crypto"

export interface SyncOptions {
  envPath: string
  templatePath: string
  variables?: string[]
  dryRun?: boolean
}

export interface GenerateOptions {
  envPath: string
  variables: string[]
  dryRun?: boolean
}

export interface SetupResult {
  bootstrapped: boolean
  missingCount: number
  missingKeys: string[]
}

export function generateRandomHex(): string {
  return randomBytes(32).toString("hex")
}

export function getValueForKey(
  key: string,
  templateParsed: Record<string, string>
): string {
  return templateParsed[key] || ""
}
