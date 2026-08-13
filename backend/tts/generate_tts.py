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
    for line in lines:
        # remove leading speaker label like "Woman: text" using regex
        m = re.match(r"^\s*([A-Za-z][A-Za-z0-9_\- ]{0,30})\s*:\s*(.*)$", line)
        if m:
            speaker = m.group(1).strip().lower()
            content = m.group(2).strip()
        else:
            speaker = ''
            content = line

        if not content:
            continue

        # choose voice by speaker keywords (case-insensitive)
        if speaker and any(k in speaker for k in ['woman', 'female', 'she', 'lady', 'girl']):
            voice = 'en-US-JennyNeural'
        elif speaker and any(k in speaker for k in ['man', 'male', 'he', 'guy', 'gent']):
            voice = 'en-US-GuyNeural'
        elif speaker and ('agent' in speaker or 'staff' in speaker or 'agent:' in speaker):
            # use a distinct agent voice (UK English neutral)
            voice = 'en-GB-LibbyNeural'
        else:
            # alternate when no explicit speaker label
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
