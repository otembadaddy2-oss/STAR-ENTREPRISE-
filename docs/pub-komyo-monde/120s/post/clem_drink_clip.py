import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('clem_drink_kf_log.json'))
LOG='clem_drink_clip_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
P='/kling-video/v3.0/std/image-to-video'
pr="Cinematic macro portrait. Clémence drinks slowly and calmly from the transparent glass, the glass tilts a little more and the clear water level moves visibly through the glass, her eyes closed, serene. Then she lowers the glass gently away from her lips, opens her eyes and slowly turns her face toward the camera with a warm, sincere smile. Soft golden side light, shallow depth of field, very slow gentle camera drift. Natural, realistic movements, the water stays clear and colorless."
if 'cd' not in log:
    s,r=submit(P,dict(prompt=pr,image_url=kf['cd_profil_b']['url'],duration=6,sound='off',cfg_scale=0.6)); print(s,flush=True)
    if 'request_id' in r: log['cd']={'id':r['request_id']}; json.dump(log,open(LOG,'w'))
if 'cd' in log and 'url' not in log['cd']:
    r=wait(log['cd']['id'],every=8,limit=540); print(r.get('status'),r.get('error'),flush=True)
    if r.get('status')=='completed' and r.get('video'):
        log['cd']['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
        try: download(log['cd']['url'],'clip_cd.mp4')
        except Exception as e: print('download KO',e)
