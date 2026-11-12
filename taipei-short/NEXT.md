# Handoff for the next session

Owner writes in Russian; answer in Russian. Videos are English-language YouTube Shorts.

## State
- Project: Remotion (React/SVG, no AI pictures). Compositions in `src/Root.tsx`: `Taipei`, `Wombat`, `Mars`.
  Shared: `src/Scene.tsx` (exports `Captions`, helpers), `src/captions.ts` (`buildChunks`).
- Done and rendered (4K 2160x3840 @60): Taipei 101 pendulum, wombat cube poop, blue Mars sunsets.
  The owner uploaded Taipei and wombat; Mars was being uploaded by the owner.
- Voices were made with ElevenLabs ("Jerry B.", eleven_v4). ElevenLabs credits ran out (263 left, 328 needed) -> use another voice for the next Short.
- Owner does NOT want to pay Artlist.

## Next Short: why the stomach does not digest itself (human body)
Verified: mucus + bicarbonate barrier keeps the cell surface near neutral while the lumen is about pH 1-2
(Allen & Flemstrom 2005, Am J Physiol Cell Physiol, "Gastroduodenal mucus bicarbonate barrier"); the gastric surface
epithelium renews within about 3 days (Frontiers in Cell and Dev Biol 2020 review, citing Karam & Leblond 1993; popular sources say 3-5 days).
Mucus also keeps pepsin away from the wall.

Full script (58 words, needs about 330 ElevenLabs credits):
Why doesn't your stomach digest itself? It's full of strong acid and enzymes that break down protein, and the wall is protein too. The wall wears a coat: a thick layer of mucus that traps bicarbonate, a natural antacid, which neutralizes the acid right at the surface. And as a backup, the lining replaces itself every few days.

Short script (about 42 words):
Why doesn't your stomach digest itself? It's full of acid and enzymes that break down protein, and the wall is protein too. But the wall wears a coat of mucus that traps a natural antacid, and the lining replaces itself every few days.

Planned visuals: cartoon stomach (cutaway) with a worried face and bubbling green acid; steak dissolves; enzymes eye the wall; a yellow mucus "coat" appears; magnifier lens shows layers (acid on top, mucus gel with blue antacid blobs neutralising acid drops, cells below), a pH bar labelled "pH 1-2" at the top and "near neutral" at the surface, a calendar flipping days while the top cells are replaced.
Avoid unverified claims (no "dissolves metal", no exact pH at the surface).

## Voice without ElevenLabs
Plan: Gemini API TTS (Google AI Studio key). Per Google docs the model was `gemini-3.1-flash-tts-preview` called with `generateContent` and audio response modality, prebuilt voice names like "Kore" (preview; names and free-tier limits NOT verified, check ai.google.dev).
The owner will store the key as a network secret for `generativelanguage.googleapis.com` (header `x-goog-api-key`) or as env var `GEMINI_API_KEY`. Never ask for the key in chat. Ask for a short test clip before the full voice.
Alternative: the owner records their own voice and sends the file.

## Pipeline notes
- Measure pauses with `ffmpeg -af silencedetect=noise=-38dB:d=0.12`; phrase times in `Wombat.tsx` / `Mars.tsx`; word times inside phrases are estimated by character count.
- Render: `npx remotion render src/index.ts <Id> out/x.mp4 --scale=2 --concurrency=4 --browser-executable=/opt/pw-browsers/chromium --chrome-mode=chrome-for-testing --crf=16 --pixel-format=yuv420p`, then `ffmpeg -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=7`. CPU only, about 25 minutes per Short.
- Captions: 80 px, bold white with black outline, current word yellow, 3 words max, y=1330.
- Network: the cloud container only reaches allowed hosts (`elevenlabsusercontent.com` was added to the owner's environment).
- Sound effects are synthesised with numpy (`tools/*_sfx.py`).
- Upload goes through the owner's Chrome with Claude in Chrome in a local session; confirm with the owner before any publish.
