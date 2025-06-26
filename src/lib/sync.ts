import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { parse } from "dotenv"
import { getValueForKey, type SetupResult, type SyncOptions } from "./common"

interface DetailedSetupResult extends SetupResult {
  missingKeyValues?: Record<string, string>
}

function getKeysToProcess(templateParsed: Record<string, string>, variables?: string[]): string[] {
  const allTemplateKeys = Object.keys(templateParsed)

  // Include variables from template (filtered by --only if provided)
  return variables && variables.length > 0 ? variables.filter((key) => allTemplateKeys.includes(key)) : allTemplateKeys
}

function bootstrapEnvFile(
  envPath: string,
  templateContent: string,
  templateParsed: Record<string, string>,
  keysToBootstrap: string[],
  variables?: string[],
  dryRun?: boolean,
): void {
  if (dryRun) return

  if (variables && variables.length > 0) {
    const filteredLines = keysToBootstrap.map((key) => `${key}="${getValueForKey(key, templateParsed)}"`)
    writeFileSync(envPath, `${filteredLines.join("\n")}\n`)
    return
  }

  // Copy template content as-is without modifying existing format
  writeFileSync(envPath, templateContent)
}

function appendMissingVariables(
  envPath: string,
  missingKeys: string[],
  defaults: Record<string, string>,
  dryRun?: boolean,
): void {
  if (dryRun || missingKeys.length === 0) return

  const lines = missingKeys.map((k) => `${k}="${getValueForKey(k, defaults)}"`)
  writeFileSync(envPath, `\n${lines.join("\n")}\n`, {
    flag: "a",
  })
}

export function syncDotenv(options: SyncOptions): DetailedSetupResult {
  const { envPath, templatePath, variables, dryRun } = options

  const templateContent = readFileSync(templatePath, "utf8")
  const templateParsed = parse(templateContent)

  // Handle bootstrap case (no .env file exists)
  if (!existsSync(envPath)) {
    const keysToBootstrap = getKeysToProcess(templateParsed, variables)

    bootstrapEnvFile(envPath, templateContent, templateParsed, keysToBootstrap, variables, dryRun)

    const missingKeyValues = keysToBootstrap.reduce(
      (acc, key) => {
        acc[key] = getValueForKey(key, templateParsed)
        return acc
      },
      {} as Record<string, string>,
    )

    return {
      bootstrapped: true,
      missingCount: keysToBootstrap.length,
      missingKeys: keysToBootstrap,
      missingKeyValues,
    }
  }

  // Handle sync case (.env file exists)
  const current = parse(readFileSync(envPath, "utf8"))
  const availableKeys = getKeysToProcess(templateParsed, variables)
  const missingKeys = availableKeys.filter((key) => !(key in current))

  appendMissingVariables(envPath, missingKeys, templateParsed, dryRun)

  const missingKeyValues = missingKeys.reduce(
    (acc, key) => {
      acc[key] = getValueForKey(key, templateParsed)
      return acc
    },
    {} as Record<string, string>,
  )

  return {
    bootstrapped: false,
    missingCount: missingKeys.length,
    missingKeys,
    missingKeyValues,
  }
}
