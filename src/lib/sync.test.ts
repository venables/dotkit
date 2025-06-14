import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs"
import { setupDotenv } from "./sync.js"

describe("setupDotenv", () => {
  const testEnvPath = ".env.test"
  const testExamplePath = ".env.example.test"

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

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL"])
    expect(existsSync(testEnvPath)).toBe(true)
    expect(readFileSync(testEnvPath, "utf8")).toBe(exampleContent)
  })

  it("returns no changes when all variables are present", () => {
    const content = "API_KEY=my_key\nDB_URL=postgres://prod"
    writeFileSync(testEnvPath, content)
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(0)
    expect(result.missingKeys).toEqual([])
    expect(readFileSync(testEnvPath, "utf8")).toBe(content)
  })

  it("appends missing variables to existing .env", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "DEBUG"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).toContain("# Added by envsync")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).toContain("DEBUG=true")
  })

  it("handles empty .env file", () => {
    writeFileSync(testEnvPath, "")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("# Added by envsync")
    expect(envContent).toContain("API_KEY=example_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")
  })

  it("handles .env with comments and empty lines", () => {
    writeFileSync(
      testEnvPath,
      "# This is a comment\nAPI_KEY=my_key\n\n# Another comment"
    )
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(1)
    expect(result.missingKeys).toEqual(["DB_URL"])
  })

  it("only copies specified variables when provided", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nPORT=3000"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["DB_URL", "PORT"]
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "PORT"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).toContain("PORT=3000")
    expect(envContent).not.toContain("DEBUG=true")
  })

  it("bootstraps with only specified variables", () => {
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nPORT=3000"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["API_KEY", "DB_URL"]
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=example_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).not.toContain("DEBUG=true")
    expect(envContent).not.toContain("PORT=3000")
  })

  it("handles non-existent variables gracefully", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["NON_EXISTENT", "DB_URL", "ALSO_MISSING"]
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(1)
    expect(result.missingKeys).toEqual(["DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).not.toContain("NON_EXISTENT")
    expect(envContent).not.toContain("ALSO_MISSING")
  })

  it("shows what would be copied in dry run mode", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      dryRun: true
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
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      dryRun: true
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(3)
    expect(result.missingKeys).toEqual(["API_KEY", "DB_URL", "DEBUG"])

    // File should not be created in dry run
    expect(existsSync(testEnvPath)).toBe(false)
  })

  it("shows filtered variables in dry run mode", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nPORT=3000"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["DB_URL", "PORT"],
      dryRun: true
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["DB_URL", "PORT"])

    // File should not be modified in dry run
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=my_key")
  })

  it("generates random hex values for specified variables", () => {
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateVariables: ["AUTH_SECRET", "JWT_SECRET"]
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(4)
    expect(result.missingKeys).toEqual([
      "AUTH_SECRET",
      "JWT_SECRET",
      "API_KEY",
      "DB_URL"
    ])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=example_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).not.toContain("AUTH_SECRET=placeholder")

    // Check that AUTH_SECRET and JWT_SECRET have random hex values (64 chars)
    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    const jwtSecretMatch = envContent.match(/JWT_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
    expect(jwtSecretMatch).toBeTruthy()
    expect(authSecretMatch![1]).not.toBe(jwtSecretMatch![1]) // Different values
  })

  it("appends generated variables to existing .env", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateVariables: ["AUTH_SECRET"]
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).not.toContain("AUTH_SECRET=placeholder")

    // Check that AUTH_SECRET has random hex value
    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
  })

  it("combines --only and --generate options", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nDEBUG=true\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      variables: ["DB_URL", "AUTH_SECRET"],
      generateVariables: ["AUTH_SECRET"]
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "DB_URL"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")
    expect(envContent).not.toContain("DEBUG=true") // Excluded by --only
    expect(envContent).not.toContain("AUTH_SECRET=placeholder")

    // Check that AUTH_SECRET has random hex value
    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
  })

  it("generates variables not in template", () => {
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateVariables: ["JWT_SECRET", "SESSION_SECRET"]
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(4)
    expect(result.missingKeys).toEqual([
      "JWT_SECRET",
      "SESSION_SECRET",
      "API_KEY",
      "DB_URL"
    ])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=example_key")
    expect(envContent).toContain("DB_URL=postgres://localhost")

    // Check that generated variables have random hex values
    const jwtMatch = envContent.match(/JWT_SECRET=([a-f0-9]{64})/)
    const sessionMatch = envContent.match(/SESSION_SECRET=([a-f0-9]{64})/)
    expect(jwtMatch).toBeTruthy()
    expect(sessionMatch).toBeTruthy()
  })

  it("handles generate variables in dry run mode", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateVariables: ["AUTH_SECRET", "JWT_SECRET"],
      dryRun: true
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(3)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "JWT_SECRET", "DB_URL"])

    // File should not be modified in dry run
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=my_key")
  })

  it("generates only specified variables with --generate-only", () => {
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateOnlyVariables: ["AUTH_SECRET", "JWT_SECRET"]
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "JWT_SECRET"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).not.toContain("API_KEY=example_key")
    expect(envContent).not.toContain("DB_URL=postgres://localhost")
    expect(envContent).not.toContain("AUTH_SECRET=placeholder")

    // Check that only generated variables are present
    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    const jwtSecretMatch = envContent.match(/JWT_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
    expect(jwtSecretMatch).toBeTruthy()
    expect(authSecretMatch![1]).not.toBe(jwtSecretMatch![1])
  })

  it("appends only generated variables to existing .env with --generate-only", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateOnlyVariables: ["AUTH_SECRET", "SESSION_SECRET"]
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "SESSION_SECRET"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=my_key")
    expect(envContent).not.toContain("DB_URL=postgres://localhost") // Not copied from template
    expect(envContent).not.toContain("AUTH_SECRET=placeholder")

    // Check that generated variables are present
    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    const sessionSecretMatch = envContent.match(/SESSION_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
    expect(sessionSecretMatch).toBeTruthy()
  })

  it("handles --generate-only in dry run mode", () => {
    writeFileSync(testEnvPath, "API_KEY=my_key")
    writeFileSync(
      testExamplePath,
      "API_KEY=example_key\nDB_URL=postgres://localhost\nAUTH_SECRET=placeholder"
    )

    const result = setupDotenv({
      envPath: testEnvPath,
      templatePath: testExamplePath,
      generateOnlyVariables: ["AUTH_SECRET", "JWT_SECRET"],
      dryRun: true
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "JWT_SECRET"])

    // File should not be modified in dry run
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=my_key")
  })
})
