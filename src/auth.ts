import { createHash } from "node:crypto";

export interface AuthKeys {
  publicKey: string;
  secretKey: string;
}

/**
 * Signs GET request parameters by appending publicKey, time, and hash to the query string.
 *
 * Algorithm (matches PHP RestClient.php):
 * 1. Start with existing query params (e.g. page, perPage)
 * 2. Append publicKey and time as string
 * 3. Hash = SHA256(params.toString() + ':' + secretKey)
 * 4. Append hash to params
 */
export function signGetParams(
  queryArgs: Record<string, string>,
  keys: AuthKeys,
  time?: number,
): URLSearchParams {
  const params = new URLSearchParams(queryArgs);
  const timeValue = time ?? Math.floor(Date.now() / 1000);

  params.set("publicKey", keys.publicKey);
  params.set("time", String(timeValue));

  const hashInput = params.toString() + ":" + keys.secretKey;
  const hash = createHash("sha256").update(hashInput).digest("hex");

  params.set("hash", hash);
  return params;
}

/**
 * Signs POST request body by adding publicKey, time, and hash fields.
 *
 * Algorithm (matches PHP RestClient.php):
 * 1. Spread {...data, publicKey, time} where time is a number
 * 2. Hash = SHA256(JSON.stringify(dataToSign) + ':' + secretKey)
 * 3. Return {...dataToSign, hash}
 *
 * Note: PHP uses JSON_UNESCAPED_SLASHES. JavaScript's JSON.stringify
 * never escapes forward slashes, so this matches by default.
 */
export function signPostBody(
  data: Record<string, unknown>,
  keys: AuthKeys,
  time?: number,
): Record<string, unknown> {
  const timeValue = time ?? Math.floor(Date.now() / 1000);

  const dataToSign: Record<string, unknown> = {
    ...data,
    publicKey: keys.publicKey,
    time: timeValue,
  };

  const hashInput = JSON.stringify(dataToSign) + ":" + keys.secretKey;
  const hash = createHash("sha256").update(hashInput).digest("hex");

  return { ...dataToSign, hash };
}
