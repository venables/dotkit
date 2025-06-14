#!/usr/bin/env node
import { program } from "commander"
import { syncDotenv } from "./lib/sync.js"
import { generateVariables } from "./lib/generate.js"

program
  .name("dotkit")
  .description(
    "A powerful CLI toolkit for managing environment variables and dotenv files"
  )
  .version("1.0.0")

// Sync command
program
  .command("sync")
  .description("Sync environment variables from template to .env file")
  .option("-t, --target <path>", "target .env file (destination)", ".env")
  .option(
    "-s, --source <path>",
    "source file to sync from (e.g., .env.example)",
    ".env.example"
  )
  .option("--only <variables...>", "only copy these specific variables")
  .option("--dry-run", "show what would be copied without making changes")
  .action(
    (options: {
      target: string
      source: string
      only?: string[]
      dryRun?: boolean
    }) => {
      try {
        const result = syncDotenv({
          envPath: options.target,
          templatePath: options.source,
          variables: options.only,
          dryRun: options.dryRun
        })

        if (options.dryRun) {
          if (result.bootstrapped) {
            console.log(
              `[DRY RUN] Would create ${options.target} from ${options.source}`
            )
            if (result.missingKeys.length > 0) {
              console.log(`[DRY RUN] Would copy these variables:`)
              result.missingKeys.forEach((key) => console.log(`  - ${key}`))
            }
          } else if (result.missingCount === 0) {
            console.log(
              "[DRY RUN] All variables already present – nothing to do."
            )
          } else {
            console.log(
              `[DRY RUN] Would append ${result.missingCount} variable(s) to ${options.target}:`
            )
            result.missingKeys.forEach((key) => console.log(`  - ${key}`))
          }
        } else if (result.bootstrapped) {
          console.log(`Created ${options.target} from ${options.source}`)
        } else if (result.missingCount === 0) {
          console.log("All variables already present – nothing to do.")
        } else {
          console.log(
            `Appended ${result.missingCount} variable(s) to ${options.target}`
          )
        }
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error)
        process.exit(1)
      }
    }
  )

// Generate command
program
  .command("generate")
  .description("Generate random hex values for environment variables")
  .argument("<variables...>", "variable names to generate values for")
  .option("-t, --target <path>", "target .env file", ".env")
  .option("--dry-run", "show what would be generated without making changes")
  .option("-f, --force", "overwrite existing values")
  .action(
    (
      variables: string[],
      options: { target: string; dryRun?: boolean; force?: boolean }
    ) => {
      try {
        const result = generateVariables({
          envPath: options.target,
          variables,
          dryRun: options.dryRun,
          force: options.force
        })

        if (options.dryRun) {
          if (result.bootstrapped) {
            console.log(
              `[DRY RUN] Would create ${options.target} with generated values for: ${variables.join(", ")}`
            )
          } else if (result.missingKeys.length === 0) {
            console.log(
              `[DRY RUN] All variables already exist in ${options.target} – nothing to do.`
            )
            if (!options.force) {
              console.log(
                `[DRY RUN] Use -f or --force to overwrite existing values.`
              )
            }
          } else if (result.missingKeys.length < variables.length) {
            const existing = variables.filter(
              (v) => !result.missingKeys.includes(v)
            )
            console.log(
              `[DRY RUN] Would generate values for: ${result.missingKeys.join(", ")}`
            )
            console.log(
              `[DRY RUN] Already exist (skipping): ${existing.join(", ")}`
            )
          } else {
            console.log(
              `[DRY RUN] Would generate values for: ${result.missingKeys.join(", ")}`
            )
          }
        } else {
          if (result.bootstrapped) {
            console.log(
              `Created ${options.target} with generated values for: ${variables.join(", ")}`
            )
          } else if (result.missingKeys.length === 0) {
            console.log(
              `All variables already exist in ${options.target} – nothing to do.`
            )
            if (!options.force) {
              console.log(`Use -f or --force to overwrite existing values.`)
            }
          } else if (result.missingKeys.length < variables.length) {
            const existing = variables.filter(
              (v) => !result.missingKeys.includes(v)
            )
            console.log(
              `Generated values for: ${result.missingKeys.join(", ")}`
            )
            if (!options.force) {
              console.log(`Already exist (skipped): ${existing.join(", ")}`)
            }
          } else {
            console.log(
              `Generated values for: ${result.missingKeys.join(", ")}`
            )
          }
        }
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error)
        process.exit(1)
      }
    }
  )

program.parse()
