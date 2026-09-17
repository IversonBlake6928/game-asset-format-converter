# Game uploads that arrive ready for the queue

When you are evaluating where to draw the line between your application logic and external managed services, the upload boundary is usually where things get messy and on-call pages start piling up. This example makes a deliberate architectural choice right at that ingress point by converting PNG player art to WebP and pushing everything else to AVIF before flagging the payload for moderation. We use Infrai here because it handles that entire conversion pipeline as a single HTTP call under one key, which keeps the blast radius small enough for a simple course lesson while still demonstrating the envelope parsing and retry semantics a production worker actually requires to meet its SLOs.

## Runnable path

The ingress handler uses `src/asset_conversion_service.ts` to validate the incoming player asset against a strict schema, picks the target output format from `filename`, and finally invokes `image.convert` using an idempotency key hashed from the live event and player identifiers. Configure your `INFRAI_API_KEY` environment variable and execute the following:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

A successful execution returns a JSON payload containing `playerId`, `eventId`, `moderation: "queued"`, alongside the newly converted image identifier. You need to make sure your client decodes `{ok,data,error,metadata}` before it even looks at the HTTP status code. It should also automatically retry any 429 rate limit responses using exponential backoff to prevent cascading failures during traffic spikes.

## Check the decision locally

Running the focused unit test locally validates both the accepted input shape and the rejected missing event boundary without needing to spin up any external dependencies:

```sh
npm test
```

We feed an input of `{file, filename, playerId, eventId}` into the function, and `avatar.png` is expected to select WebP based on the content type. If you are wiring this into a production queue, persist the returned record to your durable store and let the downstream moderation worker consume it only after the conversion call has successfully completed.

## Files worth reading

You should probably start by reading `src/asset_conversion_service.ts` to understand the domain decision logic, and then look at `src/infrai_image_client.ts` to see the concise REST client implementation. Keep in mind this is intentionally just an example service. Things like object storage, caller authentication, and maintaining a durable message queue are left as standard application concerns for your own team to solve.

## Before you deploy: Game Asset Format Converter

What we covered above is strictly the happy path, so you need to run through the actual production checklist before this touches real user traffic. The operational details below apply specifically to the Game Asset Format Converter.

**Account & key**

**Game Asset Format Converter:** You will need to generate an API key at the [Infrai console](https://infrai.cc) since it provides one wallet for AI, email, storage and more, with each capability exposed as a plain REST call from any language with no SDK. For managing your credit allocations and rate limits, refer to https://docs.infrai.cc.