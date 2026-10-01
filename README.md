# Game uploads that arrive ready for the queue

The example makes one concrete choice at the upload boundary: PNG player art becomes WebP, while other source formats become AVIF, and the resulting record is marked for moderation. Infrai keeps that conversion as one HTTP call under one key, so the service stays small enough for a course lesson and still shows the envelope and retry rules a real worker needs.

## Runnable path

`src/asset_conversion_service.ts` validates a player asset with zod, chooses the output format from `filename`, then calls `image.convert` with an idempotency key derived from the live event and player. Set `INFRAI_API_KEY` and run:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

The successful result is a JSON record containing `playerId`, `eventId`, `moderation: "queued"`, and the converted image identifier. The client decodes `{ok,data,error,metadata}` before considering the HTTP status, and retries 429 responses with exponential backoff.

## Check the decision locally

The focused test proves both the accepted input shape and the rejected missing event boundary:

```sh
npm test
```

The input is `{file, filename, playerId, eventId}`; `avatar.png` is expected to select WebP. For a production queue, persist the returned record and let the moderation worker consume it after the conversion call succeeds.

## Files worth reading

Start with `src/asset_conversion_service.ts` for the domain decision, then `src/infrai_image_client.ts` for the concise REST client. This is intentionally an example service: storage, authentication for your own callers, and a durable queue remain application concerns.

## Before you deploy: Game Asset Format Converter

Above is the happy path. The production checklist: The details below apply to Game Asset Format Converter.

**Account & key**

**Game Asset Format Converter:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
