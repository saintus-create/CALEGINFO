# California Legislative Information

Ask questions about California law and get answers cited to the statute, rule,
Judicial Council form or opinion they come from. The chat lives at `/` and the
code / bill / rule / form / directory browsers sit behind it.

## Voice

The site speaks and listens in two places:

- **Dictation.** The microphone button in the composer records a question and
  drops the transcript into the text box, ready to edit or send. Records with
  `MediaRecorder` and transcribes through `/api/voice/transcribe`; on-device
  Web Speech dictation takes over when the server cannot serve it. A pause ends
  the recording on its own, and transcripts are appended to whatever the box
  already held.
- **Read aloud.** Every answer has a speaker button that reads it back, chunked
  at sentence boundaries with the next chunk pre-fetched while the current one
  plays. Markdown, tables, link targets and citation chips are stripped first,
  so the audio is prose rather than scaffolding.

Both use Sarvam's speech APIs (`saaras` for speech-to-text, `bulbul` for
speech synthesis) with the same subscription key as chat. When that key has no
speech entitlement, the endpoints are unreachable, or the route answers with
`fallback: "browser"`, the client switches to the browser's own Web Speech APIs
and says so in the notice bar — the controls never go dead.

### Endpoints

| Route | Purpose |
| --- | --- |
| `GET /api/voice` | What this deployment can do: engines, models, speaker, key source. |
| `GET /api/voice?probe=1` | Calls STT and TTS for real and reports `ok`, so a deploy can be checked without a microphone. |
| `POST /api/voice/transcribe` | Recording in (`file` part or raw `audio/*` body), transcript out. |
| `POST /api/voice/speak` | `{ text }` in, audio bytes out (`x-voice-engine`, `x-voice-model` headers). |

Failures use one shape — `{ error, code, detail, fallback, engine }` — where
`fallback: "browser"` is the client's cue to retry on-device. The codes are
`NO_KEY`, `STT_DISABLED`/`TTS_DISABLED` (503), `BAD_REQUEST`/`EMPTY_AUDIO`/
`EMPTY_TEXT`/`NO_AUDIO`/`UPSTREAM_REJECTED` (400), `UNSUPPORTED_MEDIA_TYPE`
(415), `EMPTY_TRANSCRIPT` (422), `TEXT_TOO_LONG`/`AUDIO_TOO_LARGE` (413),
`RATE_LIMITED` (429), `NOT_ENTITLED` (403), `UPSTREAM_*` (502) and `INTERNAL`
(500). When Upstash/KV is configured the routes are rate limited per client
(30 transcriptions and 60 speech requests per minute).

### Configuration

All of it is optional and documented in `.env.example`: `SARVAM_API_KEY` (falls
back to the built-in key the chat route already uses), `SARVAM_STT_MODEL`,
`SARVAM_STT_MODE`, `SARVAM_STT_LANGUAGE`, `SARVAM_TTS_MODEL`,
`SARVAM_TTS_SPEAKER`, `SARVAM_TTS_LANGUAGE`, `SARVAM_TTS_PACE`,
`SARVAM_STT_ENABLED`/`SARVAM_TTS_ENABLED`, and `SARVAM_VOICE_BASE_URL` /
`SARVAM_STT_URL` / `SARVAM_TTS_URL` / `SARVAM_VOICE_TIMEOUT_MS` for pointing
the voice calls somewhere else.

### Verifying voice

```bash
pnpm run check:voice     # 58 checks, no network: mock upstream + real pipeline
pnpm run typecheck
```

`scripts/mock_sarvam.mjs` is a dependency-free stand-in for api.sarvam.ai, for
machines that cannot reach it:

```bash
node scripts/mock_sarvam.mjs --port 8787            # or --fail 403
SARVAM_VOICE_BASE_URL=http://127.0.0.1:8787 pnpm dev
curl -s localhost:3000/api/voice | jq
curl -s "localhost:3000/api/voice?probe=1" | jq
```

Microphone capture needs a secure context: `http://localhost` or an HTTPS
origin. Nothing else in the app requires permission.

## Development

```bash
pnpm install
pnpm dev                                  # http://localhost:3000
pnpm typecheck
pnpm check:forms && pnpm check:voice      # corpus + voice checks
pnpm storybook                            # component workbench
```
