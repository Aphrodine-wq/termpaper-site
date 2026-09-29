// Raw DEFLATE on the server, for share codes.
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { Codec } from "../web/theme.js";

export const nodeCodec: Codec = {
  deflate: async (d) => new Uint8Array(deflateRawSync(d, { level: 9 })),
  inflate: async (d) => new Uint8Array(inflateRawSync(d, { maxOutputLength: 64 * 1024 })),
};
