import subprocess

TOTAL = float(open("out/total_length.txt").read().strip())
SR = 44100

d = [2.8, 2.7, 2.7, 2.7, 2.7, 2.7, 2.7, 2.7, 1.8, 3.6]
trans = 0.5

# recompute the same cumulative offsets used by the video crossfades
offsets = []
cum = d[0]
for i in range(1, len(d)):
    offsets.append(cum - trans)
    cum = cum + d[i] - trans

whoosh_times = [round(o + trans / 2, 2) for o in offsets]
chime_times = [0.0, round(offsets[7] + trans, 2), round(offsets[8] + trans, 2)]
print("total", TOTAL)
print("whoosh_times", whoosh_times)
print("chime_times", chime_times)


def run(cmd):
    subprocess.run(cmd, check=True)


# --- ambient pad bed ---
run([
    "ffmpeg", "-y",
    "-f", "lavfi", "-i", f"sine=frequency=110:duration={TOTAL}:sample_rate={SR}",
    "-f", "lavfi", "-i", f"sine=frequency=164.81:duration={TOTAL}:sample_rate={SR}",
    "-f", "lavfi", "-i", f"sine=frequency=220:duration={TOTAL}:sample_rate={SR}",
    "-filter_complex",
    "[0][1][2]amix=inputs=3:duration=longest:weights=1 0.7 0.4,"
    "tremolo=f=0.12:d=0.25,"
    "lowpass=f=1200,"
    f"afade=t=in:d=2,afade=t=out:st={TOTAL-2.2}:d=2.2,"
    "volume=0.11",
    "audio/ambient.wav",
])

# --- chime (bell) one-shot ---
run([
    "ffmpeg", "-y",
    "-f", "lavfi", "-i",
    ("aevalsrc=exprs="
     "'0.55*sin(2*PI*880*t)*exp(-3.0*t) + "
     "0.30*sin(2*PI*1318.5*t)*exp(-3.4*t) + "
     "0.18*sin(2*PI*1760*t)*exp(-3.8*t)'"
     f":sample_rate={SR}:duration=1.3"),
    "-af", "volume=0.5",
    "audio/chime.wav",
])

# --- whoosh (filtered noise burst) one-shot ---
run([
    "ffmpeg", "-y",
    "-f", "lavfi", "-i", f"anoisesrc=color=pink:duration=0.5:sample_rate={SR}",
    "-af", "bandpass=f=1600:width_type=h:w=1800,afade=t=in:d=0.04,afade=t=out:st=0.14:d=0.34,volume=0.35",
    "audio/whoosh.wav",
])

# --- place delayed copies + mix everything ---
inputs = ["-i", "audio/ambient.wav"]
filter_inputs = ["[0:a]"]
idx = 1
for t in chime_times:
    inputs += ["-i", "audio/chime.wav"]
    ms = int(t * 1000)
    filter_inputs.append(f"[{idx}:a]adelay={ms}|{ms}[c{idx}];")
    idx += 1
for t in whoosh_times:
    inputs += ["-i", "audio/whoosh.wav"]
    ms = int(t * 1000)
    filter_inputs.append(f"[{idx}:a]adelay={ms}|{ms}[w{idx}];")
    idx += 1

delay_chain = "".join(filter_inputs[1:])
mix_labels = "[0:a]" + "".join(f"[c{i+1}]" for i in range(len(chime_times))) + \
             "".join(f"[w{len(chime_times)+1+i}]" for i in range(len(whoosh_times)))
n_mix = 1 + len(chime_times) + len(whoosh_times)
filter_complex = delay_chain + f"{mix_labels}amix=inputs={n_mix}:duration=longest:normalize=0,alimiter=limit=0.9,atrim=0:{TOTAL}[aout]"

cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filter_complex, "-map", "[aout]", "audio/final_audio.wav"]
run(cmd)
print("audio done")
