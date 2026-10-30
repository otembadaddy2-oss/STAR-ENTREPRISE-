#!/usr/bin/env python3
"""Prépare les séquences animées de Keydou pour le site à partir des vidéos brutes (fond vert uni).
Usage : build_clips.py <dossier_brut> <dossier_sortie>
Entrée : idle, look, jump, spin, walk, think, sit, talk, celebrate, dance, wave (.mp4, 960x960, fond vert pur)
Sortie : petits .mp4 recadrés sur le personnage (sans son), que la page « keydou.html » détoure en direct (incrustation verte)."""
import os, subprocess, sys, shutil
import numpy as np
from PIL import Image

raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
tmp = os.path.join(out, '_tmp'); os.makedirs(tmp, exist_ok=True)
NAMES = ['idle', 'look', 'jump', 'spin', 'walk', 'think', 'sit', 'talk', 'celebrate', 'dance', 'wave']
SIZE, FPS, CRF = 360, 24, 29

def run(*a): subprocess.run(a, check=True)

# 1) cadre commun : union des zones « pas vertes » de toutes les séquences
x0 = y0 = 10**9; x1 = y1 = 0
for n in NAMES:
    d = os.path.join(tmp, 'f_' + n); os.makedirs(d, exist_ok=True)
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', f'{raw}/{n}.mp4', '-vf', 'fps=3', f'{d}/%03d.png')
    for f in sorted(os.listdir(d)):
        a = np.asarray(Image.open(f'{d}/{f}').convert('RGB')).astype(int)
        m = (a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2])) < 90
        ys, xs = np.where(m)
        if len(xs): x0 = min(x0, xs.min()); x1 = max(x1, xs.max()); y0 = min(y0, ys.min()); y1 = max(y1, ys.max())
    shutil.rmtree(d)
W = x1 - x0; H = y1 - y0; S = int(max(W, H) * 1.08)
cx = (x0 + x1) // 2; cy = (y0 + y1) // 2
X = max(0, min(960 - S, cx - S // 2)); Y = max(0, min(960 - S, cy - S // 2)); S = min(S, 960)
CROP = f'crop={S}:{S}:{X}:{Y},scale={SIZE}:{SIZE}:flags=lanczos,fps={FPS}'
print('cadre', X, Y, S)

def enc_pp(src, name, trim=''):
    vf = (trim + ',' if trim else '') + 'setpts=PTS-STARTPTS,' + CROP
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', f'{raw}/{src}.mp4', '-an', '-filter_complex', f'[0:v]{vf},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[o]', '-map', '[o]',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', str(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{out}/{name}.mp4')
    print(name, os.path.getsize(f'{out}/{name}.mp4') // 1024, 'Ko')

def enc_plain(src, name, trim='', rev=False):
    vf = (trim + ',' if trim else '') + 'setpts=PTS-STARTPTS,' + CROP + (',reverse' if rev else '')
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', f'{raw}/{src}.mp4', '-an', '-vf', vf,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', str(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{out}/{name}.mp4')
    print(name, os.path.getsize(f'{out}/{name}.mp4') // 1024, 'Ko')

enc_pp('idle', 'idle')                       # respiration, aller-retour
enc_pp('talk', 'talk')                       # il parle
enc_pp('think', 'think')                     # il réfléchit
enc_pp('dance', 'dance')
enc_pp('sit', 'sitloop', trim='trim=start=1.5')   # assis, il attend
enc_plain('sit', 'sitdown', trim='trim=end=1.5')  # il s'assoit
enc_plain('sit', 'stand', trim='trim=end=1.5', rev=True)  # il se lève (la même séquence à l'envers)
for n in ['walk', 'jump', 'spin', 'look', 'celebrate', 'wave']:
    enc_plain(n, n)
shutil.rmtree(tmp)
