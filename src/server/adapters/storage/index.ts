import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";
import { absoluteUrl } from "@/lib/share";

/** Where uploaded files (cover images) live. Pick one with `STORAGE_PROVIDER`. */
export interface FileStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** A URL anyone can load the file from. */
  publicUrl(key: string): string;
}

/** Keys look like `covers/<uuid>.webp`; nothing else is accepted. */
const SAFE_KEY = /^[a-z0-9-]+\/[a-zA-Z0-9_-]+\.(webp|png|jpg)$/;

export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key)) throw new Error(`Unsafe storage key: ${key}`);
}

/** Files on the local disk, served by the /uploads route. For development and simple setups. */
function createLocalStorage(): FileStorage & { read(key: string): Promise<Buffer> } {
  const root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.STORAGE_LOCAL_DIR);
  const resolve = (key: string) => {
    assertSafeKey(key);
    return path.join(root, key);
  };
  return {
    async put(key, body) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
    publicUrl(key) {
      return absoluteUrl(`/uploads/${key}`);
    },
    async read(key) {
      return readFile(resolve(key));
    },
  };
}

/** Any S3-compatible bucket. In production: Cloudflare R2 (free egress). */
async function createS3Storage(): Promise<FileStorage> {
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  if (!env.S3_BUCKET || !env.S3_PUBLIC_URL) {
    throw new Error("S3_BUCKET and S3_PUBLIC_URL are required when STORAGE_PROVIDER=s3");
  }
  const bucket = env.S3_BUCKET;
  const publicBase = env.S3_PUBLIC_URL.replace(/\/$/, "");
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });
  return {
    async put(key, body, contentType) {
      assertSafeKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
    async delete(key) {
      assertSafeKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    publicUrl(key) {
      return `${publicBase}/${key}`;
    },
  };
}

let storagePromise: Promise<FileStorage> | undefined;

export function getFileStorage(): Promise<FileStorage> {
  storagePromise ??=
    env.STORAGE_PROVIDER === "s3" ? createS3Storage() : Promise.resolve(createLocalStorage());
  return storagePromise;
}

/** Local-disk reader used by the /uploads route. Returns null when using S3. */
export function getLocalStorageReader(): ((key: string) => Promise<Buffer>) | null {
  return env.STORAGE_PROVIDER === "local" ? createLocalStorage().read : null;
}

/**
 * Synchronous public URL builder for rendering. Matches `publicUrl` of the active provider.
 */
export function fileUrl(key: string): string {
  if (env.STORAGE_PROVIDER === "s3" && env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  return absoluteUrl(`/uploads/${key}`);
}
