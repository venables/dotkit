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
pnpm test src/lib/sync.test.ts

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

## Usage Examples

```bash
# Sync variables from .env.example to .env
dotkit sync

# Sync with custom paths
dotkit sync --source .env.local.example --target .env.local

# Sync only specific variables
dotkit sync --only API_KEY DB_URL

# Just sync variables from template
dotkit sync

# Generate random values for variables
dotkit generate AUTH_SECRET JWT_SECRET SESSION_KEY

# Generate to a specific file
dotkit generate AUTH_SECRET --target .env.local

# Force overwrite existing values
dotkit generate AUTH_SECRET --force

# Use short flags
dotkit generate AUTH_SECRET -t .env.local -f

# Dry run to see what would happen
dotkit sync --dry-run
dotkit generate AUTH_SECRET --dry-run
```

## Architecture

This is a TypeScript CLI toolkit that provides commands for managing environment variables and dotenv files. It can sync variables between template files (like `.env.example`) and actual environment files (like `.env`), as well as generate random values for secrets.

### Core Components

**Entry Point (`src/index.ts`)**

- CLI interface using Commander.js with subcommands
- **`sync` command**: Syncs environment variables from template to .env file
  - Options: `--target`, `--source`, `--only`, `--dry-run`
- **`generate` command**: Generates random hex values for specific environment variables
  - Arguments: variable names to generate
  - Options: `--target`, `--force`, `--dry-run`
- Handles output formatting for different modes (normal vs dry-run)
- Safe by default: won't overwrite existing values unless `--force` is used
- Error handling and process exit codes

**Core Logic**

**`src/lib/common.ts`** - Shared utilities and types:

- `generateRandomHex()` - Creates 64-character random hex values using Node.js crypto
- `getValueForKey()` - Gets variable value from template
- `SyncOptions`, `GenerateOptions`, and `SetupResult` interfaces

**`src/lib/sync.ts`** - Sync command logic:

- `syncDotenv()` - Main sync function with two operation modes:
  1. **Bootstrap mode**: Creates new .env file when none exists
  2. **Sync mode**: Appends missing variables to existing .env file
- `getKeysToProcess()` - Filters variables based on --only option
- `bootstrapEnvFile()` - Creates new .env files
- `appendMissingVariables()` - Adds missing vars to existing files

**`src/lib/generate.ts`** - Generate command logic:

- `generateVariables()` - Generate random hex values for specified variables with smart existing value handling
- Checks existing .env files and skips variables that already exist (unless `--force` is used)
- Force mode removes existing values and replaces them with newly generated ones
- Handles both new file creation and appending to existing files

All modules use `dotenv` package for parsing environment files and Node.js `crypto.randomBytes()` for secure random generation.

### Key Design Patterns

- **Early returns** in helper functions to reduce nesting
- **Functional decomposition** - each helper does one thing
- **Dry-run support** - all file operations respect the dryRun flag
- **Variable filtering** - `--only` option works in both bootstrap and sync modes
- **Clean separation** - `sync` only handles template copying, `generate` only handles random value creation
- **Independent commands** - each command has a single, clear responsibility

### Test Conventions

- Test descriptions use assertive language: "handles X" not "should handle X"
- **`sync.test.ts`** - Tests sync functionality covering both bootstrap and sync modes, variable filtering (`--only`), and dry-run scenarios
- **`generate.test.ts`** - Tests generate command functionality including file creation, appending, and dry-run mode
- Tests verify random hex generation produces 64-character values
- Comprehensive dry-run testing ensures no file modifications
- Tests clean up temporary files in beforeEach/afterEach hooks

### Build & Distribution

- Uses `tsdown` for TypeScript compilation
- Publishes as CLI tool via `bin` field in package.json
- ES modules (`"type": "module"`)
- Includes type definitions for TypeScript consumers
