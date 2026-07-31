/**
 * Pure helpers for project environment variables. No Node/Redis imports here so
 * both the API and the build worker can share them.
 */

export interface EnvVarInput {
  key: string;
  /** Plaintext. `undefined` means "keep whatever is already stored". */
  value?: string | null;
}

export interface EnvVarPair {
  key: string;
  value: string;
}

/** POSIX-ish shell identifier — what every bundler expects an env key to be. */
export const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const MAX_ENV_VARS = 100;
export const MAX_ENV_KEY_LENGTH = 128;
export const MAX_ENV_VALUE_LENGTH = 32 * 1024;

export class EnvVarValidationError extends Error {}

/**
 * Validate and de-duplicate raw input from the API. Later entries win on a
 * duplicate key, matching how `.env` files themselves are usually read.
 */
export function normalizeEnvVars(input: unknown): EnvVarInput[] {
  if (input == null) return [];
  if (!Array.isArray(input)) {
    throw new EnvVarValidationError("`envVars` must be an array");
  }
  if (input.length > MAX_ENV_VARS) {
    throw new EnvVarValidationError(
      `A project can have at most ${MAX_ENV_VARS} environment variables`,
    );
  }

  const byKey = new Map<string, EnvVarInput>();

  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      throw new EnvVarValidationError(
        "Each environment variable must be an object with a `key`",
      );
    }

    const { key, value } = entry as { key?: unknown; value?: unknown };
    if (typeof key !== "string" || !key.trim()) {
      throw new EnvVarValidationError("Environment variable key is required");
    }

    const trimmedKey = key.trim();
    if (trimmedKey.length > MAX_ENV_KEY_LENGTH) {
      throw new EnvVarValidationError(
        `Key "${trimmedKey.slice(0, 20)}…" is longer than ${MAX_ENV_KEY_LENGTH} characters`,
      );
    }
    if (!ENV_KEY_PATTERN.test(trimmedKey)) {
      throw new EnvVarValidationError(
        `"${trimmedKey}" is not a valid environment variable name. Use letters, digits and underscores, and don't start with a digit.`,
      );
    }

    if (value === undefined || value === null) {
      byKey.set(trimmedKey, { key: trimmedKey });
      continue;
    }
    if (typeof value !== "string") {
      throw new EnvVarValidationError(`Value for "${trimmedKey}" must be a string`);
    }
    if (value.length > MAX_ENV_VALUE_LENGTH) {
      throw new EnvVarValidationError(
        `Value for "${trimmedKey}" is larger than ${MAX_ENV_VALUE_LENGTH} bytes`,
      );
    }

    byKey.set(trimmedKey, { key: trimmedKey, value });
  }

  return [...byKey.values()];
}

/**
 * Parse a `.env` blob. Deliberately forgiving — it accepts `export FOO=bar`,
 * quoted values and `#` comments, because users paste real files into the UI.
 * Unparseable lines are ignored rather than rejected.
 */
export function parseDotEnv(text: string): EnvVarPair[] {
  const out = new Map<string, string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!ENV_KEY_PATTERN.test(key)) continue;

    let value = withoutExport.slice(eq + 1).trim();

    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
      // Only double quotes carry escape sequences, same as dotenv itself.
      if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    } else {
      // An unquoted value ends at the first inline comment.
      const comment = value.indexOf(" #");
      if (comment !== -1) value = value.slice(0, comment).trim();
    }

    out.set(key, value);
  }

  return [...out.entries()].map(([key, value]) => ({ key, value }));
}

/**
 * Render pairs back into `.env` syntax. Values are always double-quoted and
 * escaped so newlines, spaces and `#` survive the round trip.
 */
export function serializeDotEnv(vars: EnvVarPair[]): string {
  return (
    vars
      .map(({ key, value }) => {
        const escaped = value
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r");
        return `${key}="${escaped}"`;
      })
      .join("\n") + "\n"
  );
}
