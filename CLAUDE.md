# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Core development workflow:

```bash
# Install dependencies
pnpm install

# Run tests (uses vitest)
pnpm test

# Run single test file
pnpm test src/lib/dotenv-setup.test.ts

# Build the CLI tool
pnpm build

# Run all checks (format, lint, typecheck)
pnpm check

# Auto-fix formatting and linting issues
pnpm fix

# Individual checks
pnpm run check-format  # Check Prettier formatting
pnpm run lint          # Run oxlint + publint
pnpm run typecheck     # TypeScript type checking
```

## Architecture

This is a TypeScript CLI tool that syncs environment variables between template files (like `.env.example`) and actual environment files (like `.env`).

### Core Components

**Entry Point (`src/index.ts`)**

- CLI interface using Commander.js
- Parses options: `--env`, `--template`, `--only`, `--generate`, `--generate-only`, `--dry-run`
- Handles output formatting for different modes (normal vs dry-run)
- Error handling and process exit codes

**Core Logic (`src/lib/dotenv-setup.ts`)**

- `setupDotenv()` - Main function with two operation modes:
  1. **Bootstrap mode**: Creates new .env file when none exists
  2. **Sync mode**: Appends missing variables to existing .env file
- Helper functions with single responsibilities:
  - `getKeysToProcess()` - Filters variables based on --only, --generate, --generate-only options
  - `getValueForKey()` - Determines if a variable should be generated or copied from template
  - `generateRandomHex()` - Creates 64-character random hex values using Node.js crypto
  - `bootstrapEnvFile()` - Creates new .env files
  - `appendMissingVariables()` - Adds missing vars to existing files
- Uses `dotenv` package for parsing environment files
- Uses Node.js `crypto.randomBytes()` for secure random generation

### Key Design Patterns

- **Early returns** in helper functions to reduce nesting
- **Functional decomposition** - each helper does one thing
- **Dry-run support** - all file operations respect the dryRun flag
- **Variable filtering** - `--only` option works in both bootstrap and sync modes
- **Generation modes** - `--generate` adds to template copying, `--generate-only` replaces it
- **Orthogonal options** - `--only`, `--generate`, and `--generate-only` can be combined logically

### Test Conventions

- Test descriptions use assertive language: "handles X" not "should handle X"
- Tests cover both bootstrap and sync modes
- Tests cover generation modes (`--generate` and `--generate-only`)
- Tests verify random hex generation produces 64-character values
- Comprehensive dry-run testing ensures no file modifications
- Tests clean up temporary files in beforeEach/afterEach hooks

### Build & Distribution

- Uses `tsdown` for TypeScript compilation
- Publishes as CLI tool via `bin` field in package.json
- ES modules (`"type": "module"`)
- Includes type definitions for TypeScript consumers
