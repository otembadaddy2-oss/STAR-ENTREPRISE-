import json, os, sys
sys.path.insert(0,'..')
from hf import *
LOG='water_kf_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
K={
 'w1_pour_clair': "Macro close-up photograph of crystal clear water being poured from a glass pitcher into a transparent drinking glass on a shop counter. The stream is smooth and transparent, the water in the glass is perfectly clear and calm with a clean flat surface. Absolutely no foam, no froth, no bubbles on the surface, no white milky water. Warm golden bokeh of a West African neighborhood boutique shelves in the background, soft natural light, photorealistic, shallow depth of field.",
 'w2_sous_leau': "Photorealistic underwater point of view inside a clear body of water, the camera is submerged looking straight up toward the surface. Gentle waves and ripples ripple on the water surface above, shimmering light rays and caustics, a few tiny bubbles rising, crystal clear blue-green water with warm golden light coming from above through the surface. Cinematic macro, no text, no objects.",
}
for k,pr in K.items():
    if k in log: continue
    s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,resolution='1k',aspect_ratio='16:9',quality='medium'))
    print(k,s,str(d)[:100],flush=True)
    if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
for k in K:
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),flush=True)
        im=r.get('images') or []
        if r.get('status')=='completed' and im:
            log[k]['url']=im[0]['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],k+'.png')
            except Exception as e: print('download KO',e)
