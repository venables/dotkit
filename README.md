# dotenv-setup

A lightweight CLI tool to keep your `.env` and `.env.example` files in sync. Automatically syncs environment variables from your example file to your local environment file, ensuring you never miss a required configuration.

## Features

- **Bootstrap**: Creates `.env` from `.env.example` if it doesn't exist
- **Sync**: Adds missing environment variables from `.env.example` to existing `.env`
- **Generate**: Creates random hex values for secrets (perfect for AUTH_SECRET, JWT_SECRET, etc.)
- **Safe**: Preserves existing values in your `.env` file
- **Fast**: Lightweight with minimal dependencies

## Installation

```bash
npm install -g dotenv-setup
```

Or run directly with npx:

```bash
npx dotenv-setup
```

## Usage

### Basic Usage

Run in your project directory:

```bash
dotenv-setup
```

This will sync variables from `.env.example` to `.env`.

### Custom Template File

```bash
dotenv-setup --template .env.local.template
```

### Copy Specific Variables

Copy only specific variables from the template file:

```bash
dotenv-setup --only \
  DATABASE_URL \
  AUTH_SECRET \
  STRIPE_KEY \
  WHATEVER_ELSE
```

This will only copy the specified variables from `.env.example` to `.env`, ignoring all other variables.

### Generate Random Values

Generate random hex values for secrets:

```bash
# Generate secrets AND copy all other variables from template
dotenv-setup --generate AUTH_SECRET JWT_SECRET SESSION_SECRET

# Generate ONLY these secrets (no template copying)
dotenv-setup --generate-only AUTH_SECRET JWT_SECRET SESSION_SECRET
```

This generates 64-character random hex values (equivalent to `openssl rand -hex 32`) for the specified variables. Perfect for secrets that need unique random values.

You can also combine `--generate` with `--only` to copy some variables and generate others:

```bash
dotenv-setup --only DATABASE_URL AUTH_SECRET --generate AUTH_SECRET
```

This copies `DATABASE_URL` from the template and generates a random value for `AUTH_SECRET`.

### Dry Run

See what would be copied without making any changes:

```bash
dotenv-setup --dry-run
```

This will show you exactly which variables would be copied or created.

### Options

- `-e, --env <path>`: Target .env file (default: `.env`)
- `-t, --template <path>`: Source template file (default: `.env.example`)
- `--only <variables...>`: Only copy these specific variables
- `--generate <variables...>`: Generate random hex values for these variables (also copies from template)
- `--generate-only <variables...>`: Generate random hex values for these variables only (no template copying)
- `--dry-run`: Show what would be copied without making changes
- `-V, --version`: Show version number
- `-h, --help`: Show help

## How It Works

1. **Bootstrap Mode**: If your `.env` file doesn't exist, it creates one by copying the template file
2. **Sync Mode**: If `.env` exists, it parses both files and appends any missing variables from the template
3. **Preserve Values**: Your existing `.env` values are never overwritten

## Example

Given these files:

**.env.example**

```sh
API_KEY=your_api_key_here
DATABASE_URL=postgres://localhost:5432/myapp
AUTH_SECRET=placeholder_secret
DEBUG=false
PORT=3000
```

**.env** (existing)

```sh
API_KEY=prod_key_12345
DATABASE_URL=postgres://prod.example.com/myapp
```

Running `dotenv-setup --generate-only AUTH_SECRET` will append to `.env`:

```sh
API_KEY=prod_key_12345
DATABASE_URL=postgres://prod.example.com/myapp

# Added by dotenv-setup
AUTH_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

The `AUTH_SECRET` gets a randomly generated 64-character hex value, and no other template variables are copied.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Lint and format
pnpm check
pnpm fix
```

## License

MIT

---

_Inspired by [sync-dotenv](https://github.com/codeshifu/sync-dotenv), which is a great tool but appears to no longer be actively maintained._
