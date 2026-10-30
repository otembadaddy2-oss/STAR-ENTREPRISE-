import json, os, sys
sys.path.insert(0,'..')
from hf import *
B='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
CL=B+'8bcbec5c-ff9d-453a-b26a-fa4353181ba5.jpg'
KF=json.load(open('kf2_log.json'))['k12_clemence']['url']
LOG='clem_drink_kf_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
def run(k,refs,pr):
    if k not in log:
        s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,image_urls=refs,resolution='1k',aspect_ratio='16:9',quality='medium')); print(k,s,flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),flush=True)
        im=r.get('images') or []
        if r.get('status')=='completed' and im: log[k]['url']=im[0]['url']; json.dump(log,open(LOG,'w')); download(log[k]['url'],k+'.png')
P=" Image 1 and image 2 show Clémence (exact face, long wavy dark hair). Extreme close-up in PROFILE of Clémence drinking calmly from a transparent drinking glass of clear colorless water: the glass is tilted, its rim touches her lips, the water level is visible through the glass, her eyes are gently closed with a serene look, warm golden side sunlight caressing her skin, soft blurred neutral blue-grey background, one hand holding the glass at the left of the frame. Cinematic macro portrait, shallow depth of field, photorealistic, no text, no logo."
run('cd_profil_a',[CL,KF],P)
run('cd_profil_b',[CL,KF],P.replace("Extreme close-up in PROFILE","Close-up in three-quarter PROFILE view"))
