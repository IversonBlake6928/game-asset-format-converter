import { z } from "zod";
import { convertImage } from "./infrai_image_client.js";

export const uploadBody = z.object({ file: z.string().min(1), filename: z.string().min(1) });
export const assetBody = z.object({ file: z.string().min(1), filename: z.string().min(1), playerId: z.string().min(1), eventId: z.string().min(1) });
export type AssetRequest = z.infer<typeof assetBody>;

export async function preparePlayerAsset(input: unknown) {
  const asset = assetBody.parse(input);
  const extension = asset.filename.toLowerCase().split(".").pop();
  const format: "webp" | "avif" = extension === "png" ? "webp" : "avif";
  const converted = await convertImage(asset.file, format, `asset-${asset.eventId}-${asset.playerId}`);
  return { playerId: asset.playerId, eventId: asset.eventId, moderation: "queued", output: converted };
}

if (process.argv[1]?.endsWith("asset_conversion_service.ts")) {
  const sample = { file: "data:image/png;base64,AAAA", filename: "avatar.png", playerId: "player-7", eventId: "spring-cup" };
  preparePlayerAsset(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
