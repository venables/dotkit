import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { syncDotenv } from "./sync.js"

describe("syncDotenv", () => {
  const testEnvPath = ".env.sync.test"
  const testExamplePath = ".env.example.sync.test"

  beforeEach(() => {
    // Clean up any existing test files
    if (existsSync(testEnvPath)) unlinkSync(testEnvPath)
    if (existsSync(testExamplePath)) unlinkSync(testExamplePath)
  })

  afterEach(() => {
    // Clean up test files
    if (existsSync(testEnvPath)) unlinkSync(testEnvPath)
    if (existsSync(testExamplePath)) unlinkSync(testExamplePath)
  })

  it("bootstraps .env from .env.example when .env does not exist", () => {
    const exampleContent = "API_KEY=example_key\nDB_URL=postgres://localhost"
    writeFileSync(testExamplePath, exampleContent)

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL"])
    expect(existsSync(testEnvPath)).toBe(true)
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=example_key\nDB_URL=postgres://localhost")
  })

  it("returns no changes when all variables are present", () => {
    const content = "API_KEY=my_key\nDB_URL=postgres://prod"
    writeFileSync(testEnvPath, content)
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(0)
    expect(result.missingKeys).toEqual([])
    expect(readFileSync(testEnvPath, "utf8")).toBe(content)
  })

  it("appends missing variables to existing .env", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "DEBUG"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).toContain('DB_URL="postgres://localhost"')
    expect(envContent).toContain('DEBUG="true"')
  })

  it("handles empty .env file", () => {
    writeFileSync(testEnvPath, "")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain('API_KEY="example_key"')
    expect(envContent).toContain('DB_URL="postgres://localhost"')
  })

  it("handles .env with comments and empty lines", () => {
    writeFileSync(testEnvPath, "# This is a comment\nAPI_KEY=my_key\n\n# Another comment")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(1)
    expect(result.missingKeys).toEqual(["DB_URL"])
  })

  it("only copies specified variables when provided", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nPORT=3000")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["DB_URL", "PORT"],
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "PORT"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).toContain('DB_URL="postgres://localhost"')
    expect(envContent).toContain('PORT="3000"')
    expect(envContent).not.toContain("DEBUG=true")
  })

  it("bootstraps with only specified variables", () => {
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nPORT=3000")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["API_KEY", "DB_URL"],
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain('API_KEY="example_key"')
    expect(envContent).toContain('DB_URL="postgres://localhost"')
    expect(envContent).not.toContain("DEBUG=true")
    expect(envContent).not.toContain("PORT=3000")
  })

  it("handles non-existent variables gracefully", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["NON_EXISTENT", "DB_URL", "ALSO_MISSING"],
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(1)
    expect(result.missingKeys).toEqual(["DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain('DB_URL="postgres://localhost"')
    expect(envContent).not.toContain("NON_EXISTENT")
    expect(envContent).not.toContain("ALSO_MISSING")
  })

  it("shows what would be copied in dry run mode", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      dryRun: true,
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "DEBUG"])

    // File should not be modified in dry run
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=my_key")
    expect(envContent).not.toContain("DB_URL")
    expect(envContent).not.toContain("DEBUG")
  })

  it("shows bootstrap in dry run mode", () => {
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      dryRun: true,
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(3)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL", "DEBUG"])

    // File should not be created in dry run
    expect(existsSync(testEnvPath)).toBe(false)
  })

  it("shows filtered variables in dry run mode", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(testExamplePath, "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nPORT=3000")

    const result = syncDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["DB_URL", "PORT"],
      dryRun: true,
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "PORT"])

    // File should not be modified in dry run
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=my_key")
  })
})
