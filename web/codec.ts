// Raw DEFLATE in the browser, for share codes.
import type { Codec } from "./theme.js";

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export const browserCodec: Codec = {
  deflate: (d) => pipe(d, new CompressionStream("deflate-raw")),
  inflate: (d) => pipe(d, new DecompressionStream("deflate-raw")),
};
