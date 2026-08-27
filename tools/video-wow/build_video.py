import subprocess
import os

W, H, FPS = 1080, 1920, 30
TRANS = 0.5

SCENES = [
    ("slides/slide_00.png", 2.8),
    ("slides/slide_01.png", 2.7),
    ("slides/slide_02.png", 2.7),
    ("slides/slide_03.png", 2.7),
    ("slides/slide_04.png", 2.7),
    ("slides/slide_05.png", 2.7),
    ("slides/slide_06.png", 2.7),
    ("slides/slide_07.png", 2.7),
    ("slides/slide_08.png", 1.8),
    ("slides/slide_09.png", 3.6),
]

os.makedirs("clips", exist_ok=True)


def run(cmd):
    subprocess.run(cmd, check=True)


def make_clip(img, dur, idx):
    out = f"clips/scene_{idx:02d}.mp4"
    frames = int(dur * FPS)
    zoom_expr = f"min(zoom+0.0011,1.12)"
    vf = (
        f"scale={W*2}:{H*2}:flags=lanczos,"
        f"zoompan=z='{zoom_expr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"s={W}x{H}:fps={FPS},"
        f"format=yuv420p"
    )
    cmd = [
        "ffmpeg", "-y", "-loop", "1", "-i", img,
        "-t", str(dur), "-vf", vf,
        "-r", str(FPS), "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16",
        "-pix_fmt", "yuv420p", out,
    ]
    run(cmd)
    return out


clips = []
for i, (img, dur) in enumerate(SCENES):
    print("rendering", img, dur)
    clips.append(make_clip(img, dur, i))

# ---- chain with xfade crossfades in a single filter_complex pass ----
inputs = []
for c in clips:
    inputs += ["-i", c]

filter_parts = []
cur_label = "0:v"
cum_dur = SCENES[0][1]
for i in range(1, len(clips)):
    next_label = f"v{i}"
    offset = cum_dur - TRANS
    filter_parts.append(
        f"[{cur_label}][{i}:v]xfade=transition=fade:duration={TRANS}:offset={offset:.3f}[{next_label}]"
    )
    cur_label = next_label
    cum_dur = cum_dur + SCENES[i][1] - TRANS

total_len = cum_dur
filter_complex = ";".join(filter_parts)

cmd = [
    "ffmpeg", "-y", *inputs,
    "-filter_complex", filter_complex,
    "-map", f"[{cur_label}]",
    "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "16",
    "-pix_fmt", "yuv420p", "out/video_silent.mp4",
]
print("TOTAL LENGTH:", total_len)
run(cmd)

with open("out/total_length.txt", "w") as f:
    f.write(str(total_len))

print("DONE silent video, length =", total_len)
