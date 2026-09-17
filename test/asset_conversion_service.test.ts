import assert from "node:assert/strict";
import { assetBody } from "../src/asset_conversion_service.js";

const parsed = assetBody.parse({ file: "data:image/png;base64,AAAA", filename: "avatar.png", playerId: "p1", eventId: "e1" });
assert.equal(parsed.filename, "avatar.png");
assert.throws(() => assetBody.parse({ file: "x", filename: "avatar.png", playerId: "p1" }));
console.log("asset request validation passed");
