import json, os, sys
sys.path.insert(0,'..')
from hf import *
LOG='water_clips_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
k2=json.load(open('water_kf2_log.json')); k1=json.load(open('water_kf_log.json'))
P='/kling-video/v3.0/std/image-to-video'
J={
 'wc1': (k2['w1a']['url'],4,"Macro shot. The thin clear stream of water keeps pouring from the pitcher into the transparent glass, the water level slowly rises, the water stays perfectly clear and transparent with no foam, no froth and no milky look. Slow macro push-in toward the stream where it meets the surface, soft golden bokeh behind."),
 'wc2': (k1['w2_sous_leau']['url'],5,"Underwater point of view. The camera glides slowly upward through crystal clear water toward the surface, gentle waves ripple above, shimmering light rays and caustics move, tiny bubbles rise past the lens, warm golden light grows brighter as the camera nears the surface. Smooth, immersive, cinematic."),
}
for k,(img,d,pr) in J.items():
    if k in log: continue
    s,r=submit(P,dict(prompt=pr,image_url=img,duration=d,sound='off',cfg_scale=0.5)); print(k,s,flush=True)
    if 'request_id' in r: log[k]={'id':r['request_id']}; json.dump(log,open(LOG,'w'))
for k in J:
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=8,limit=540); print(k,r.get('status'),r.get('error'),flush=True)
        if r.get('status')=='completed' and r.get('video'):
            log[k]['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],f'clip_{k}.mp4')
            except Exception as e: print('download KO',e)
