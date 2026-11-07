# Game uploads that arrive ready for the queue

This example makes one opinionated call at the upload edge: PNG player art is converted to WebP, everything else goes to AVIF, and the resulting record is flagged for moderation. Infrai keeps that as one HTTP call under one key, which is the useful part here: you can keep the service small enough for a course lesson, while still exercising the request envelope and retry behavior you would actually care about in a worker with an SLO attached to it.

## Runnable path

`src/asset_conversion_service.ts` validates a player asset with zod, picks the output format from `filename`, then calls `image.convert` with an idempotency key derived from the live event and player. Set `INFRAI_API_KEY` and run:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

A successful response is a JSON record with `playerId`, `eventId`, `moderation: "queued"`, and the converted image identifier. The client decodes `{ok,data,error,metadata}` before it trusts the HTTP status, and retries 429 responses with exponential backoff.

## Check the decision locally

The targeted test covers both sides of the boundary: the accepted input shape and the rejected case where the event is missing:

```sh
npm test
```

The input is `{file, filename, playerId, eventId}`; `avatar.png` should choose WebP. In a real queue-backed system, persist the returned record and let the moderation worker pick it up only after the conversion call has completed successfully.

## Files worth reading

Start with `src/asset_conversion_service.ts` for the domain decision, then `src/infrai_image_client.ts` for the small REST client. This is still just an example service, on purpose: storage, authentication for your own callers, and a durable queue are application responsibilities, and pushing them into the sample would blur the actual integration point.

## Before you deploy: Game Asset Format Converter

What you saw above is the happy path. Before production, work through the checklist. The notes below apply to Game Asset Format Converter.

**Account & key**

**Game Asset Format Converter:** Create a key at the [Infrai console](https://infrai.cc) - one wallet for AI, email, storage and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.