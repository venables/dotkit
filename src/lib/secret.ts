import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { parse } from "dotenv"
import { type GenerateOptions, generateRandomHex, type SetupResult } from "./common"

interface DetailedGenerateResult extends SetupResult {
  missingKeyValues?: Record<string, string>
}

export function generateVariables(options: GenerateOptions): DetailedGenerateResult {
  const { envPath, variables, length = 32, dryRun, force } = options

  const bootstrapped = !existsSync(envPath)
  let existingKeys: string[] = []
  let variablesToGenerate = variables

  if (!bootstrapped) {
    // Read and parse existing .env file
    const existingContent = readFileSync(envPath, "utf8")
    const existingParsed = parse(existingContent)
    existingKeys = Object.keys(existingParsed)

    if (!force) {
      // Filter out variables that already exist
      variablesToGenerate = variables.filter((key) => !(key in existingParsed))
    }
  }

  if (!dryRun && variablesToGenerate.length > 0) {
    const lines = variablesToGenerate.map((key) => `${key}="${generateRandomHex(length)}"`)

    if (bootstrapped) {
      // Create new file
      writeFileSync(envPath, `${lines.join("\n")}\n`)
    } else if (force && variables.some((key) => existingKeys.includes(key))) {
      // Force mode: remove existing keys and rewrite file
      const existingContent = readFileSync(envPath, "utf8")
      const existingParsed = parse(existingContent)

      // Remove variables that we're regenerating
      const variablesToRemove = variables.filter((key) => key in existingParsed)
      let updatedContent = existingContent

      // Remove existing lines for variables we're regenerating
      variablesToRemove.forEach((key) => {
        const regex = new RegExp(`^${key}=.*$`, "gm")
        updatedContent = updatedContent.replace(regex, "")
      })

      // Clean up empty lines
      updatedContent = updatedContent.replace(/\n\n+/g, "\n").trim()

      // Add new generated values
      const newContent = `${updatedContent + (updatedContent ? "\n\n" : "") + lines.join("\n")}\n`

      writeFileSync(envPath, newContent)
    } else {
      // Append to existing file (normal mode)
      writeFileSync(envPath, `\n${lines.join("\n")}\n`, {
        flag: "a",
      })
    }
  }

  // Generate sample values for dry-run display
  const missingKeyValues = variablesToGenerate.reduce(
    (acc, key) => {
      acc[key] = generateRandomHex(length)
      return acc
    },
    {} as Record<string, string>,
  )

  return {
    bootstrapped,
    missingCount: variablesToGenerate.length,
    missingKeys: variablesToGenerate,
    missingKeyValues,
  }
}
