import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";

import { verifyDiscordRequest } from "../src/discord";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function signRequest(body: string, timestamp: string, secretKey: Uint8Array): string {
  const message = new TextEncoder().encode(`${timestamp}${body}`);
  return toHex(nacl.sign.detached(message, secretKey));
}

describe("verifyDiscordRequest", () => {
  it("accepts a valid discord signature", async () => {
    const keyPair = nacl.sign.keyPair();
    const body = JSON.stringify({ type: 1 });
    const timestamp = "1711900000";
    const signature = signRequest(body, timestamp, keyPair.secretKey);

    const request = new Request("https://example.com/discord/interactions", {
      body,
      headers: {
        "Content-Type": "application/json",
        "X-Signature-Ed25519": signature,
        "X-Signature-Timestamp": timestamp,
      },
      method: "POST",
    });

    const result = await verifyDiscordRequest(request, toHex(keyPair.publicKey));
    expect(result.isValid).toBe(true);
    expect(result.bodyText).toBe(body);
  });

  it("rejects an invalid discord signature", async () => {
    const keyPair = nacl.sign.keyPair();
    const request = new Request("https://example.com/discord/interactions", {
      body: JSON.stringify({ type: 1 }),
      headers: {
        "Content-Type": "application/json",
        "X-Signature-Ed25519": "00".repeat(64),
        "X-Signature-Timestamp": "1711900000",
      },
      method: "POST",
    });

    const result = await verifyDiscordRequest(request, toHex(keyPair.publicKey));
    expect(result.isValid).toBe(false);
  });
});
