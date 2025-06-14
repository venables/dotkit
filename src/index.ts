#!/usr/bin/env node
import { program } from "commander"
import { setupDotenv } from "./lib/sync.js"

program
  .name("envsync")
  .description(
    "Sync environment variables from template to .env with optional random generation"
  )
  .version("1.0.0")
  .option("-e, --env <path>", "target .env file (destination)", ".env")
  .option(
    "-t, --template <path>",
    "source template file (e.g., .env.example)",
    ".env.example"
  )
  .option("--only <variables...>", "only copy these specific variables")
  .option(
    "--generate <variables...>",
    "generate random hex values for these variables (also copies from template)"
  )
  .option(
    "--generate-only <variables...>",
    "generate random hex values for these variables only (no template copying)"
  )
  .option("--dry-run", "show what would be copied without making changes")
  .parse()

const { env, template, only, generate, generateOnly, dryRun } = program.opts<{
  env: string
  template: string
  only?: string[]
  generate?: string[]
  generateOnly?: string[]
  dryRun?: boolean
}>()

try {
  const result = setupDotenv({
    envPath: env,
    templatePath: template,
    variables: only,
    generateVariables: generate,
    generateOnlyVariables: generateOnly,
    dryRun
  })

  if (dryRun) {
    if (result.bootstrapped) {
      console.log(`[DRY RUN] Would create ${env} from ${template}`)
      if (result.missingKeys.length > 0) {
        console.log(`[DRY RUN] Would copy these variables:`)
        result.missingKeys.forEach((key) => console.log(`  - ${key}`))
      }
    } else if (result.missingCount === 0) {
      console.log("[DRY RUN] All variables already present – nothing to do.")
    } else {
      console.log(
        `[DRY RUN] Would append ${result.missingCount} variable(s) to ${env}:`
      )
      result.missingKeys.forEach((key) => console.log(`  - ${key}`))
    }
  } else if (result.bootstrapped) {
    console.log(`Created ${env} from ${template}`)
  } else if (result.missingCount === 0) {
    console.log("All variables already present – nothing to do.")
  } else {
    console.log(`Appended ${result.missingCount} variable(s) to ${env}`)
  }
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error)
  process.exit(1)
}
