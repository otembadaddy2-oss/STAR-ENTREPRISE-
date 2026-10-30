import json, os, sys
sys.path.insert(0,'..')
from hf import *
LOG='water_kf2_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
base="Photograph of ordinary clear drinking water being poured from a glass pitcher into a transparent glass tumbler on a wooden shop counter. The water is completely colorless and transparent like tap water: you can see the wooden counter and the background through the water and the glass, with light refraction. A thin clear stream falls into the glass, small ripples on a clear surface. NOT milky, NOT white, NOT cloudy, no foam, no froth, no bubbles. Blurred warm West African boutique shelves behind, golden natural light, realistic, shallow depth of field."
K={'w1a':base,'w1b':base.replace('Photograph of','Close-up side view photograph of').replace('wooden shop counter','wooden shop counter, the glass is half full')}
for k,pr in K.items():
    if k in log: continue
    s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,resolution='1k',aspect_ratio='16:9',quality='medium'))
    print(k,s,flush=True)
    if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
for k in K:
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),flush=True)
        im=r.get('images') or []
        if r.get('status')=='completed' and im:
            log[k]['url']=im[0]['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],k+'.png')
            except Exception as e: print('download KO',e)
