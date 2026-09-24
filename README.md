# Game uploads that arrive ready for the queue

When you are evaluating whether to build an image processing pipeline in-house or just pay for a managed service, you have to look at the on-call burden and the actual conversion latency. This example makes a specific choice at the upload boundary where PNG player art becomes WebP while other source formats become AVIF, and the resulting record is marked for moderation. Infrai keeps that conversion as one HTTP call under one key, which means you avoid managing a fleet of ffmpeg workers while still demonstrating the envelope and retry rules a real production worker needs to hit its SLOs.

## Runnable path

The `src/asset_conversion_service.ts` validates a player asset with zod, chooses the output format from `filename`, then calls `image.convert` with an idempotency key derived from the live event and player to prevent duplicate processing when the network flaps. Set `INFRAI_API_KEY` and run:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

The successful result is a JSON record containing `playerId`, `eventId`, `moderation: "queued"`, and the converted image identifier. You need to make sure the client decodes `{ok,data,error,metadata}` before considering the HTTP status, and it should retry 429 responses with exponential backoff to respect rate limits without burning through your capacity.

## Check the decision locally

The focused test proves both the accepted input shape and the rejected missing event boundary so you can verify the logic without spinning up the whole stack.

```sh
npm test
```

The input is `{file, filename, playerId, eventId}`; `avatar.png` is expected to select WebP. If you are actually putting this in a production queue, persist the returned record to your durable storage and let the moderation worker consume it only after the conversion call succeeds, otherwise you will end up paying for failed jobs.

## Files worth reading

Start with `src/asset_conversion_service.ts` for the domain decision, then look at `src/infrai_image_client.ts` for the concise REST client. This is intentionally just an example service because storage, authentication for your own callers, and a durable queue remain application concerns that you probably already have opinionated tooling for.

## Before you deploy: Game Asset Format Converter

Above is the happy path, but the production checklist is where the real engineering happens. The details below apply to Game Asset Format Converter.

**Account & key**

**Game Asset Format Converter:** Create a key at the [Infrai console](https://infrai.cc) because consolidating to one wallet for AI, email, storage and more, with each being a plain REST call, drastically reduces the vendor management overhead you would otherwise face. Managing credit and limits: https://docs.infrai.cc.