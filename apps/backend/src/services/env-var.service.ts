import { prisma } from "@repo/db";
import { encryptSecret } from "@repo/shared/crypto/secrets";
import {
  EnvVarValidationError,
  type EnvVarInput,
} from "@repo/shared/env/vars";

/** What the API is allowed to hand back — never the decrypted value. */
export interface EnvVarSummary {
  id: string;
  key: string;
  updatedAt: Date;
}

export class EnvVarService {
  /**
   * Values are write-only over the API: only Shipyard decrypts them, at build
   * time. Listing returns keys and timestamps so the UI can show what exists.
   */
  listEnvVars(projectId: string): Promise<EnvVarSummary[]> {
    return prisma.envVar.findMany({
      where: { projectId },
      orderBy: { key: "asc" },
      select: { id: true, key: true, updatedAt: true },
    });
  }

  /**
   * Replace the project's whole set in one transaction.
   *
   * An entry with a `value` is written (encrypted); an entry without one keeps
   * whatever is already stored — that's how the UI saves without ever having
   * seen the existing secret. Keys absent from `desired` are deleted.
   */
  async replaceEnvVars(
    projectId: string,
    desired: EnvVarInput[],
  ): Promise<EnvVarSummary[]> {
    const existing = await prisma.envVar.findMany({
      where: { projectId },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((v) => v.key));

    const missingValue = desired.find(
      (v) => v.value == null && !existingKeys.has(v.key),
    );
    if (missingValue) {
      throw new EnvVarValidationError(
        `"${missingValue.key}" is new, so it needs a value`,
      );
    }

    const desiredKeys = new Set(desired.map((v) => v.key));
    const removedKeys = [...existingKeys].filter((k) => !desiredKeys.has(k));

    await prisma.$transaction([
      ...(removedKeys.length
        ? [
            prisma.envVar.deleteMany({
              where: { projectId, key: { in: removedKeys } },
            }),
          ]
        : []),
      ...desired
        .filter((v) => v.value != null)
        .map((v) => {
          const encrypted = encryptSecret(v.value as string);
          return prisma.envVar.upsert({
            where: { projectId_key: { projectId, key: v.key } },
            create: { projectId, key: v.key, value: encrypted },
            update: { value: encrypted },
          });
        }),
    ]);

    return this.listEnvVars(projectId);
  }

  /** Encrypted rows for a nested `create` on a brand-new project. */
  buildCreateData(vars: EnvVarInput[]): { key: string; value: string }[] {
    return vars
      .filter((v) => v.value != null)
      .map((v) => ({ key: v.key, value: encryptSecret(v.value as string) }));
  }
}

export const envVarService = new EnvVarService();
