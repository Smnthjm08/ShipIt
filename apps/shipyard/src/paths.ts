import fs from "fs";
import path from "path";

export interface ContainedPath {
  absolute: string;
  /** POSIX, relative to the base — `""` at the base itself. Safe under `/app`. */
  relative: string;
}

/** Both sides of a containment check must match, or `/var` → `/private/var`
 * rejects paths that are genuinely inside the base. */
export const realpathOrSelf = (target: string): string => {
  try {
    return fs.realpathSync(target);
  } catch {
    return target; // not created yet — the lexical path still contains fine
  }
};

/**
 * Resolve a user-configured sub-path against a base, refusing anything that
 * escapes it. `rootDir` and `outputDir` come from the settings form and become
 * host paths — the output dir is what gets uploaded to a public bucket, so
 * `../../../../home/you/.ssh` would publish the host's keys. Symlinks are
 * resolved first: the build runs arbitrary commands in the clone, so
 * `ln -s / out` escapes just as well as `../`.
 */
export function resolveWithin(
  base: string,
  segment: string,
  label: string,
): ContainedPath {
  const root = realpathOrSelf(path.resolve(base));
  const cleaned = (segment ?? "").trim();

  if (!cleaned || cleaned === "." || cleaned === "./") {
    return { absolute: root, relative: "" };
  }

  if (path.isAbsolute(cleaned)) {
    throw new Error(
      `The ${label} must be relative to the repository root, but "${segment}" ` +
        "is an absolute path.",
    );
  }

  const absolute = realpathOrSelf(path.resolve(root, cleaned));

  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new Error(
      `The ${label} "${segment}" resolves outside the repository. Use a path ` +
        "inside the project, without leading `..` segments.",
    );
  }

  return {
    absolute,
    relative: path.relative(root, absolute).split(path.sep).join("/"),
  };
}
