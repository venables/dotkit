import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs"
import { generateVariables } from "./generate.js"

describe("generateVariables", () => {
  const testEnvPath = ".env.test"

  beforeEach(() => {
    // Clean up any existing test files
    if (existsSync(testEnvPath)) unlinkSync(testEnvPath)
  })

  afterEach(() => {
    // Clean up test files
    if (existsSync(testEnvPath)) unlinkSync(testEnvPath)
  })

  it("creates new file with generated variables", () => {
    const result = generateVariables({
      envPath: testEnvPath,
      variables: ["AUTH_SECRET", "JWT_SECRET"]
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "JWT_SECRET"])
    expect(existsSync(testEnvPath)).toBe(true)

    const envContent = readFileSync(testEnvPath, "utf8")
    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    const jwtSecretMatch = envContent.match(/JWT_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
    expect(jwtSecretMatch).toBeTruthy()
    expect(authSecretMatch![1]).not.toBe(jwtSecretMatch![1]) // Different values
  })

  it("appends to existing file", () => {
    writeFileSync(testEnvPath, "API_KEY=existing_key")

    const result = generateVariables({
      envPath: testEnvPath,
      variables: ["AUTH_SECRET"]
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(1)
    expect(result.missingKeys).toEqual(["AUTH_SECRET"])

    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toContain("API_KEY=existing_key")
    expect(envContent).toContain("# Added by dotkit")

    const authSecretMatch = envContent.match(/AUTH_SECRET=([a-f0-9]{64})/)
    expect(authSecretMatch).toBeTruthy()
  })

  it("shows what would be generated in dry run mode", () => {
    const result = generateVariables({
      envPath: testEnvPath,
      variables: ["AUTH_SECRET", "JWT_SECRET"],
      dryRun: true
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(2)
    expect(result.missingKeys).toEqual(["AUTH_SECRET", "JWT_SECRET"])

    // File should not be created in dry run
    expect(existsSync(testEnvPath)).toBe(false)
  })

  it("dry run with existing file", () => {
    writeFileSync(testEnvPath, "API_KEY=existing_key")

    const result = generateVariables({
      envPath: testEnvPath,
      variables: ["AUTH_SECRET"],
      dryRun: true
    })

    expect(result.bootstrapped).toBe(false)
    expect(result.missingCount).toBe(1)
    expect(result.missingKeys).toEqual(["AUTH_SECRET"])

    // File should not be modified in dry run
    const envContent = readFileSync(testEnvPath, "utf8")
    expect(envContent).toBe("API_KEY=existing_key")
    expect(envContent).not.toContain("AUTH_SECRET")
  })

  it("generates multiple variables with different values", () => {
    const result = generateVariables({
      envPath: testEnvPath,
      variables: ["SECRET_1", "SECRET_2", "SECRET_3"]
    })

    expect(result.bootstrapped).toBe(true)
    expect(result.missingCount).toBe(3)
    expect(result.missingKeys).toEqual(["SECRET_1", "SECRET_2", "SECRET_3"])

    const envContent = readFileSync(testEnvPath, "utf8")
    const secret1Match = envContent.match(/SECRET_1=([a-f0-9]{64})/)
    const secret2Match = envContent.match(/SECRET_2=([a-f0-9]{64})/)
    const secret3Match = envContent.match(/SECRET_3=([a-f0-9]{64})/)

    expect(secret1Match).toBeTruthy()
    expect(secret2Match).toBeTruthy()
    expect(secret3Match).toBeTruthy()

    // All values should be different
    expect(secret1Match![1]).not.toBe(secret2Match![1])
    expect(secret1Match![1]).not.toBe(secret3Match![1])
    expect(secret2Match![1]).not.toBe(secret3Match![1])
  })
})
