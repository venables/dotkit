import { writeFileSync, existsSync } from "node:fs"
import {
  generateRandomHex,
  type GenerateOptions,
  type SetupResult
} from "./common.js"

export function generateVariables(options: GenerateOptions): SetupResult {
  const { envPath, variables, dryRun } = options

  const bootstrapped = !existsSync(envPath)

  if (!dryRun) {
    const lines = variables.map((key) => `${key}=${generateRandomHex()}`)

    if (bootstrapped) {
      // Create new file
      writeFileSync(envPath, lines.join("\n") + "\n")
    } else {
      // Append to existing file
      writeFileSync(envPath, `\n# Added by dotkit\n${lines.join("\n")}\n`, {
        flag: "a"
      })
    }
  }

  return {
    bootstrapped,
    missingCount: variables.length,
    missingKeys: variables
  }
}
