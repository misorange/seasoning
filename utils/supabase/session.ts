export type MembershipClaims = {
  groupId?: string;
  memberId?: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function decodeBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  const bufferCtor = (
    globalThis as typeof globalThis & {
      Buffer?: {
        from: (
          value: string,
          encoding: "base64",
        ) => { toString: (encoding: "utf8") => string };
      };
    }
  ).Buffer;

  if (!bufferCtor) {
    throw new Error("A base64 decoder is not available.");
  }

  return bufferCtor.from(padded, "base64").toString("utf8");
}

export function getMembershipClaimsFromAccessToken(
  accessToken?: string | null,
): MembershipClaims {
  if (!accessToken) {
    return {};
  }

  try {
    const [, payloadSegment] = accessToken.split(".");

    if (!payloadSegment) {
      return {};
    }

    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as unknown;

    if (!isRecord(payload)) {
      return {};
    }

    const appMetadata = isRecord(payload.app_metadata)
      ? payload.app_metadata
      : {};

    return {
      groupId: readString(appMetadata.group_id) ?? readString(payload.group_id),
      memberId:
        readString(appMetadata.member_id) ?? readString(payload.member_id),
    };
  } catch {
    return {};
  }
}

export function hasMembershipClaims(
  claims: MembershipClaims,
): claims is Required<MembershipClaims> {
  return Boolean(claims.groupId && claims.memberId);
}
