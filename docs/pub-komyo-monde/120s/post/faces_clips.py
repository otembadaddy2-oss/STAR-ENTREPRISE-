import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('faces_kf_log.json'))
LOG='faces_clips_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
K='/kling-video/v3.0/std/image-to-video'
J={
 'fv': (kf['sp_verse_tel']['url'],4,"Natural candid moment. Sita stays on her phone call, the smartphone pressed to her right ear with her right hand, listening with a soft smile. With her left hand she keeps pouring clear water from the pitcher into the glass resting on the counter; the thin stream stays continuous and unbroken from the spout to the water surface in the glass. Her eyes look at the glass. Gentle realistic movements, very slow push-in. She does not look at the camera."),
 'fb': (kf['sp_boit_tel']['url'],3,"Natural candid moment. Sita stays on her phone call, the smartphone against her right ear. With her left hand she lifts the glass of clear water to her lips and takes a calm sip, eyes gently closed, then lowers the glass slightly with a satisfied smile. Gentle realistic movements, very slow push-in. She does not look at the camera."),
 'cb': (kf['cl_boit_vrai']['url'],6,"Cinematic macro portrait. Clémence drinks slowly and calmly from the transparent glass, the clear water level moves visibly through the glass as it tilts, eyes closed, serene. Then she lowers the glass gently away from her lips, opens her eyes and slowly turns her face toward the camera with a warm, sincere smile. Soft golden side light, shallow depth of field, very slow gentle camera drift. Natural realistic movements, the water stays clear and colorless."),
}
for k,(img,d,pr) in J.items():
    if k in log: continue
    s,r=submit(K,dict(prompt=pr,image_url=img,duration=d,sound='off',cfg_scale=0.6)); print(k,s,flush=True)
    if 'request_id' in r: log[k]={'id':r['request_id']}; json.dump(log,open(LOG,'w'))
# Clémence parle : Wan 2.7 sur sa voix officielle
if 'cp' not in log:
    s,r=submit('/wan/v2.7/image-to-video',dict(image_url=kf['cl_parle_vrai']['url'],audio_url='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/6551d201-109d-45db-9ea1-665c1201f731.mp3',duration=5,resolution='720p',
      prompt="A warm elegant Congolese female presenter speaks directly to the camera in a premium lounge with soft blue and gold accents. Natural lip sync with the audio, gentle head and shoulder movement, subtle smile and expressive eyes, very slow dolly in, soft cinematic light.",negative_prompt="distorted face, extra teeth, blurry, text, watermark, morphing")); print('cp',s,flush=True)
    if 'request_id' in r: log['cp']={'id':r['request_id']}; json.dump(log,open(LOG,'w'))
for k in list(log):
    if 'url' not in log[k]:
        r=wait(log[k]['id'],every=8,limit=540); print(k,r.get('status'),r.get('error'),flush=True)
        if r.get('status')=='completed' and r.get('video'):
            log[k]['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],f'clip_{k}.mp4')
            except Exception as e: print('download KO',e)
