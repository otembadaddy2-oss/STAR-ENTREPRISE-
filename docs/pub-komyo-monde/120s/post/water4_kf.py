import json, os, sys
sys.path.insert(0,'..')
from hf import *
B='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
SITA=B+'d6e19af8-e9f2-4587-9ee5-662338e126ef.jpg'
W=json.load(open('/home/user/STAR-ENTREPRISE-/docs/pub-komyo-monde/120s/images-cles/wide_ids.json'))['k06_abidjan_boutique']['url']
R1=B+'0f790b61-0046-42de-9341-cdc75f24ae70.jpg'; R2=B+'027a663f-8e94-4d47-b56f-34c450c1b8ac.jpg'
LOG='water4_kf_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
def run(k,refs,pr):
    if k not in log:
        s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,image_urls=refs,resolution='1k',aspect_ratio='16:9',quality='medium')); print(k,s,flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),flush=True)
        im=r.get('images') or []
        if r.get('status')=='completed' and im: log[k]['url']=im[0]['url']; json.dump(log,open(LOG,'w')); download(log[k]['url'],k+'.png')
COMMON=" Natural, unposed, candid moment, not looking at the camera. Sita stands behind the boutique counter and serves herself water: the glass rests ON the counter, she only steadies its base lightly with the fingertips of her left hand, and her right hand holds the pitcher LOW, tilted just above the glass; the thin clear stream falls straight into the glass and reaches the water. Her eyes look down at the glass, a soft gentle smile. Camera at counter height, three-quarter side view, medium close-up, hands and glass in the lower part of the frame. The water is completely colorless and transparent, no foam, no bubbles on top. Photorealistic, warm daylight, shallow depth of field, no text, no logo."
run('wd_natural_refs',[W,SITA,R2,R1],"Image 1 is a rich neighborhood boutique in Abidjan. Image 2 is Sita (exact face, tied braids, black vest over a white blouse). Images 3 and 4 are ONLY references for natural hand positions and pitcher angle (do not copy their people or kitchens)."+COMMON)
run('wd_natural_txt',[W,SITA],"Image 1 is a rich neighborhood boutique in Abidjan. Image 2 is Sita (exact face, tied braids, black vest over a white blouse)."+COMMON)
