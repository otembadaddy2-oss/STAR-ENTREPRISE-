import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('water3_kf_log.json'))
LOG='water3_clips_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
P='/kling-video/v3.0/std/image-to-video'
J={
 'w3a': (kf['wa_sita_verse']['url'],5,"Sita keeps pouring clear water from the glass pitcher into the glass she holds. The thin stream of water stays continuous and unbroken from the pitcher spout all the way down into the water inside the glass; it reaches the water surface, never stops in mid-air. The water level in the glass slowly rises, small ripples, the water remains colorless and transparent. She smiles, slight slow push-in."),
 'w3b': (kf['wb_macro_filet']['url'],4,"Extreme macro. The thin stream of clear water falls continuously from the top of the frame into the water in the glass, unbroken, entering the surface and spreading small ripples and a few tiny bubbles. The water level rises slightly. The blurred warm boutique behind shifts gently. Slow macro push-in."),
 'w3c': (kf['wc_dans_le_verre']['url'],4,"Extreme macro from inside the glass of clear water. The surface above gently ripples as the stream arrives, tiny bubbles rise slowly, the blurred magnified reflection of the boutique shelves and the soft face of the smiling woman shimmer and shift through the water like through a lens. Slow subtle push-in toward the surface."),
}
for k,(img,d,pr) in J.items():
    if k in log: continue
    s,r=submit(P,dict(prompt=pr,image_url=img,duration=d,sound='off',cfg_scale=0.6)); print(k,s,flush=True)
    if 'request_id' in r: log[k]={'id':r['request_id']}; json.dump(log,open(LOG,'w'))
for k in J:
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=8,limit=540); print(k,r.get('status'),r.get('error'),flush=True)
        if r.get('status')=='completed' and r.get('video'):
            log[k]['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],f'clip_{k}.mp4')
            except Exception as e: print('download KO',e)
