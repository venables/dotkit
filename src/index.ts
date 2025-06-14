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
  .option("-e, --env <path>", "target .env file (destination)", ".env")
  .option(
    "-f, --from <path>",
    "source file to sync from (e.g., .env.example)",
    ".env.example"
  )
  .option("--only <variables...>", "only copy these specific variables")
  .option("--dry-run", "show what would be copied without making changes")
  .action(
    (options: {
      env: string
      from: string
      only?: string[]
      dryRun?: boolean
    }) => {
      try {
        const result = syncDotenv({
          envPath: options.env,
          templatePath: options.from,
          variables: options.only,
          dryRun: options.dryRun
        })

        if (options.dryRun) {
          if (result.bootstrapped) {
            console.log(
              `[DRY RUN] Would create ${options.env} from ${options.from}`
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
              `[DRY RUN] Would append ${result.missingCount} variable(s) to ${options.env}:`
            )
            result.missingKeys.forEach((key) => console.log(`  - ${key}`))
          }
        } else if (result.bootstrapped) {
          console.log(`Created ${options.env} from ${options.from}`)
        } else if (result.missingCount === 0) {
          console.log("All variables already present – nothing to do.")
        } else {
          console.log(
            `Appended ${result.missingCount} variable(s) to ${options.env}`
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
  .option("-e, --env <path>", "target .env file", ".env")
  .option("--dry-run", "show what would be generated without making changes")
  .action((variables: string[], options: { env: string; dryRun?: boolean }) => {
    try {
      const result = generateVariables({
        envPath: options.env,
        variables,
        dryRun: options.dryRun
      })

      if (options.dryRun) {
        if (result.bootstrapped) {
          console.log(
            `[DRY RUN] Would create ${options.env} with generated values for: ${variables.join(", ")}`
          )
        } else {
          console.log(
            `[DRY RUN] Would generate values for: ${variables.join(", ")}`
          )
        }
      } else {
        if (result.bootstrapped) {
          console.log(
            `Created ${options.env} with generated values for: ${variables.join(", ")}`
          )
        } else {
          console.log(`Generated values for: ${variables.join(", ")}`)
        }
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
