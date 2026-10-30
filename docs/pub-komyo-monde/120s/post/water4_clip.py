import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('water4_kf_log.json'))
LOG='water4_clip_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
P='/kling-video/v3.0/std/image-to-video'
pr="Natural candid moment in the boutique. Sita keeps pouring water from the pitcher into the glass that rests on the counter, her left fingertips steadying the glass base, her eyes on the glass with a soft smile. The thin clear stream stays continuous and unbroken from the pitcher spout down into the water in the glass, never stopping in mid-air. The water level rises slowly and stays clear. Gentle, realistic, unhurried movements, very slow push-in. She does not look at the camera."
if 'wd' not in log:
    s,r=submit(P,dict(prompt=pr,image_url=kf['wd_natural_refs']['url'],duration=5,sound='off',cfg_scale=0.6)); print(s,flush=True)
    if 'request_id' in r: log['wd']={'id':r['request_id']}; json.dump(log,open(LOG,'w'))
if 'wd' in log and 'url' not in log['wd']:
    r=wait(log['wd']['id'],every=8,limit=540); print(r.get('status'),r.get('error'),flush=True)
    if r.get('status')=='completed' and r.get('video'):
        log['wd']['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
        try: download(log['wd']['url'],'clip_wd.mp4')
        except Exception as e: print('download KO',e)
