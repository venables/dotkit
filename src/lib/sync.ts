import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { parse } from "dotenv"

interface SetupOptions {
  envPath: string
  templatePath: string
  variables?: string[]
  generateVariables?: string[]
  generateOnlyVariables?: string[]
  dryRun?: boolean
}

interface SetupResult {
  bootstrapped: boolean
  missingCount: number
  missingKeys: string[]
}

function generateRandomHex(): string {
  return randomBytes(32).toString("hex")
}

function getKeysToProcess(
  templateParsed: Record<string, string>,
  variables?: string[],
  generateVariables?: string[],
  generateOnlyVariables?: string[]
): string[] {
  // If generate-only mode, only return those variables
  if (generateOnlyVariables && generateOnlyVariables.length > 0) {
    return generateOnlyVariables
  }

  const allGenerateVars = generateVariables || []
  const allTemplateKeys = Object.keys(templateParsed)

  // Include variables that should be generated (even if not in template)
  const keysFromGenerate = allGenerateVars.slice()

  // Include variables from template (filtered by --only if provided)
  const keysFromTemplate =
    variables && variables.length > 0
      ? variables.filter((key) => allTemplateKeys.includes(key))
      : allTemplateKeys

  // Combine and deduplicate
  const allKeys = [...new Set([...keysFromGenerate, ...keysFromTemplate])]

  return allKeys
}

function getValueForKey(
  key: string,
  templateParsed: Record<string, string>,
  generateVariables?: string[],
  generateOnlyVariables?: string[]
): string {
  const shouldGenerate =
    generateVariables?.includes(key) || generateOnlyVariables?.includes(key)
  return shouldGenerate ? generateRandomHex() : templateParsed[key] || ""
}

function bootstrapEnvFile(
  envPath: string,
  templateContent: string,
  templateParsed: Record<string, string>,
  keysToBootstrap: string[],
  variables?: string[],
  generateVariables?: string[],
  generateOnlyVariables?: string[],
  dryRun?: boolean
): void {
  if (dryRun) return

  if (
    (variables && variables.length > 0) ||
    (generateVariables && generateVariables.length > 0) ||
    (generateOnlyVariables && generateOnlyVariables.length > 0)
  ) {
    const filteredLines = keysToBootstrap.map(
      (key) =>
        `${key}=${getValueForKey(key, templateParsed, generateVariables, generateOnlyVariables)}`
    )
    writeFileSync(envPath, filteredLines.join("\n") + "\n")
    return
  }

  writeFileSync(envPath, templateContent)
}

function appendMissingVariables(
  envPath: string,
  missingKeys: string[],
  defaults: Record<string, string>,
  generateVariables?: string[],
  generateOnlyVariables?: string[],
  dryRun?: boolean
): void {
  if (dryRun || missingKeys.length === 0) return

  const lines = missingKeys.map(
    (k) =>
      `${k}=${getValueForKey(k, defaults, generateVariables, generateOnlyVariables)}`
  )
  writeFileSync(envPath, `\n# Added by envsync\n${lines.join("\n")}\n`, {
    flag: "a"
  })
}

export function setupDotenv(options: SetupOptions): SetupResult {
  const {
    envPath,
    templatePath,
    variables,
    generateVariables,
    generateOnlyVariables,
    dryRun
  } = options

  const templateContent = readFileSync(templatePath, "utf8")
  const templateParsed = parse(templateContent)

  // Handle bootstrap case (no .env file exists)
  if (!existsSync(envPath)) {
    const keysToBootstrap = getKeysToProcess(
      templateParsed,
      variables,
      generateVariables,
      generateOnlyVariables
    )

    bootstrapEnvFile(
      envPath,
      templateContent,
      templateParsed,
      keysToBootstrap,
      variables,
      generateVariables,
      generateOnlyVariables,
      dryRun
    )

    return {
      bootstrapped: true,
      missingCount: keysToBootstrap.length,
      missingKeys: keysToBootstrap
    }
  }

  // Handle sync case (.env file exists)
  const current = parse(readFileSync(envPath, "utf8"))
  const availableKeys = getKeysToProcess(
    templateParsed,
    variables,
    generateVariables,
    generateOnlyVariables
  )
  const missingKeys = availableKeys.filter((key) => !(key in current))

  appendMissingVariables(
    envPath,
    missingKeys,
    templateParsed,
    generateVariables,
    generateOnlyVariables,
    dryRun
  )

  return {
    bootstrapped: false,
    missingCount: missingKeys.length,
    missingKeys
  }
}
