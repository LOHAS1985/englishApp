#!/usr/bin/env python3
import sys
import os
import asyncio
import pathlib
import re

try:
    import edge_tts
except Exception:
    print('edge-tts not installed. Run: pip install edge-tts', file=sys.stderr)
    raise


async def synth(text: str, voice: str, out_path: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out_path)


def sanitize_filename(name: str) -> str:
    return ''.join(c for c in name if c.isalnum() or c in ('-', '_')).rstrip()


def main():
    if len(sys.argv) < 3:
        print('Usage: generate_tts.py <input_text_file> <base_name>', file=sys.stderr)
        sys.exit(2)

    input_file = sys.argv[1]
    base_name = sanitize_filename(sys.argv[2])

    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()

    # split lines, keep non-empty
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # output dir: backend/src/main/resources/static/audio/generated
    repo_root = pathlib.Path(__file__).resolve().parents[1]
    out_dir = repo_root / 'src' / 'main' / 'resources' / 'static' / 'audio' / 'generated'
    out_dir.mkdir(parents=True, exist_ok=True)

    tasks = []
    idx = 1
    alt = 0
    # map canonical speaker -> voice to keep voice consistent across lines
    speaker_voice = {}
    last_speaker = None

    def choose_voice_for_speaker(s: str) -> str:
        if not s:
            return None
        key = s.lower().strip()
        # explicit mapping for canonical Man/Woman labels to fixed en-US voices
        if key == 'woman':
            v = 'en-US-JennyNeural'
            speaker_voice[key] = v
            if 'used_voices' not in choose_voice_for_speaker.__dict__:
                choose_voice_for_speaker.used_voices = set()
            choose_voice_for_speaker.used_voices.add(v)
            try:
                print(f"[TTS] speaker -> voice: '{s}' -> '{v}'")
            except Exception:
                pass
            return v
        if key == 'man':
            v = 'en-US-GuyNeural'
            speaker_voice[key] = v
            if 'used_voices' not in choose_voice_for_speaker.__dict__:
                choose_voice_for_speaker.used_voices = set()
            choose_voice_for_speaker.used_voices.add(v)
            try:
                print(f"[TTS] speaker -> voice: '{s}' -> '{v}'")
            except Exception:
                pass
            return v
        if key in speaker_voice:
            return speaker_voice[key]
        # voice pools: prefer en-US voices to keep accent consistent
        FEMALE_VOICES = ['en-US-JennyNeural', 'en-US-AriaNeural']
        MALE_VOICES = ['en-US-GuyNeural', 'en-US-AntonioNeural']
        ALL_VOICES = FEMALE_VOICES + MALE_VOICES

        # track used voices to ensure uniqueness per speaker when possible
        if 'used_voices' not in choose_voice_for_speaker.__dict__:
            choose_voice_for_speaker.used_voices = set()

        used = choose_voice_for_speaker.used_voices

        # helper to pick first unused from a list
        def pick_unused(candidates):
            for vv in candidates:
                if vv not in used:
                    return vv
            return None

        # Prefer deterministic, readable mappings for very common labels
        if any(k in key for k in ['^female$', 'female', 'she', 'lady', 'girl']):
            # prefer a female en-US voice
            v = pick_unused(FEMALE_VOICES) or pick_unused(ALL_VOICES)
        elif any(k in key for k in ['^male$', 'man', 'male', 'he', 'guy', 'gent']):
            # prefer a male en-US voice
            v = pick_unused(MALE_VOICES) or pick_unused(ALL_VOICES)
        elif any(k in key for k in ['agent', 'staff', 'operator', 'desk']):
            v = pick_unused(ALL_VOICES)
        else:
            # for arbitrary names (Tom, Sarah...), try to give each a unique voice
            v = pick_unused(ALL_VOICES)

        # if all voices are used, fall back to deterministic mapping to keep consistency
        if not v:
            v = ALL_VOICES[abs(hash(key)) % len(ALL_VOICES)]

        speaker_voice[key] = v
        used.add(v)

        # log mapping so it's easy to debug which voice is used for which speaker
        try:
            print(f"[TTS] speaker -> voice: '{s}' -> '{v}'")
        except Exception:
            pass

        return v

    for line in lines:
        # match leading speaker labels like: Woman: text OR [Woman]: text OR Woman - text
        m = re.match(r"^\s*(?:\[|\()?\s*([A-Za-z][A-Za-z0-9_\- ]{0,50})\s*(?:\]|\))?\s*[:\-—]\s*(.*)$", line)
        if m:
            speaker_raw = m.group(1).strip()
            speaker = speaker_raw
            content = m.group(2).strip()
            last_speaker = speaker
        else:
            # no explicit speaker label; attribute to last speaker if present
            speaker = last_speaker
            content = line

        # final cleanup: remove any residual leading speaker label patterns
        content = re.sub(r"^\s*([A-Za-z][A-Za-z0-9_\- ]{0,50})\s*[:\-—]\s*", "", content)
        content = content.strip()
        if not content:
            continue

        voice = None
        if speaker:
            voice = choose_voice_for_speaker(speaker)
        if not voice:
            # fall back to alternating for unlabeled initial lines
            voice = 'en-US-JennyNeural' if (alt % 2 == 0) else 'en-US-GuyNeural'
            alt += 1

        out_name = f"{base_name}_{idx}.mp3"
        out_path = str(out_dir / out_name)
        idx += 1
        tasks.append((content, voice, out_path))

    async def run_all():
        for (content, voice, out_path) in tasks:
            print(f'Synthesizing -> {out_path} ({voice})')
            await synth(content, voice, out_path)

    asyncio.run(run_all())


if __name__ == '__main__':
    main()
