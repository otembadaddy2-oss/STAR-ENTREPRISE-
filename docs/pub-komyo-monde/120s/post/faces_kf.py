import json, os, sys
sys.path.insert(0,'..')
from hf import *
B='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
SITA=B+'d6e19af8-e9f2-4587-9ee5-662338e126ef.jpg'; S9=B+'c3181201-b6e7-46b2-8fcd-0953f0f3c15a.jpg'; CF=B+'5c988bc1-d2ef-4e01-855c-8fceb5d77204.jpg'
W=json.load(open('/home/user/STAR-ENTREPRISE-/docs/pub-komyo-monde/120s/images-cles/wide_ids.json'))['k06_abidjan_boutique']['url']
K12=json.load(open('kf2_log.json'))['k12_clemence']['url']
LOG='faces_kf_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
def run(k,refs,pr):
    if k not in log:
        s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,image_urls=refs,resolution='1k',aspect_ratio='16:9',quality='medium')); print(k,s,flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
for k,refs,pr in [
 ('sp_verse_tel',[W,SITA,S9],"Image 1 is the boutique in Abidjan. Image 2 is Sita's portrait (keep her EXACT face, tied braids, small gold earrings, black vest over a white puff-sleeve blouse). Image 3 shows Sita in the same boutique holding her smartphone in her RIGHT hand. Show Sita in the boutique, still on a phone call: her smartphone is pressed against her RIGHT ear, held with her right hand (on the LEFT side of the image), and with her LEFT hand (on the RIGHT side of the image) she holds a glass pitcher tilted low over a transparent glass that rests on the counter; a thin continuous clear stream falls from the spout into the water in the glass. She looks down at the glass with a soft natural smile, as if listening to the call. Camera at counter height, medium close-up, natural candid moment, not looking at the camera. Water completely clear and colorless, no foam. Photorealistic, warm daylight, no text, no logo."),
 ('sp_boit_tel',[W,SITA,S9],"Image 1 is the boutique in Abidjan. Image 2 is Sita's portrait (keep her EXACT face, tied braids, small gold earrings, black vest over a white puff-sleeve blouse). Image 3 shows Sita in the same boutique holding her smartphone in her RIGHT hand. Show Sita in the boutique, still on a phone call: her smartphone is pressed against her RIGHT ear, held with her right hand (on the LEFT side of the image). With her LEFT hand (on the RIGHT side of the image) she lifts a transparent glass of clear water to her lips and takes a calm sip, eyes gently closed, the glass tilted a little, the glass pitcher set on the counter. Camera at counter height, medium close-up, natural candid moment, not looking at the camera. Water completely clear and colorless. Photorealistic, warm daylight, no text, no logo."),
 ('cl_boit_vrai',[CF,K12],"Image 1 is Clémence's REAL face: keep her exact face, skin tone, eyes and smile. Image 2 shows her outfit and lounge. Show Clémence in extreme close-up three-quarter PROFILE drinking calmly from a transparent glass of clear colorless water, the glass tilted at her lips, her eyes gently closed, serene. She wears gold teardrop earrings and a fine gold chain, long wavy dark hair, an ivory blazer. Warm golden side sunlight, soft blurred blue-grey background, shallow depth of field, cinematic macro portrait, photorealistic, no text, no logo."),
 ('cl_parle_vrai',[CF,K12],"Image 1 is Clémence's REAL face: keep her exact face, skin tone, eyes and smile. Image 2 shows her outfit and the premium lounge. Show Clémence facing the camera in that elegant premium lounge with soft blue and gold accents, warm sincere smile, about to speak, medium close-up, slightly right of center. She wears gold teardrop earrings and a fine gold chain with a round gold medallion pendant, long wavy dark hair, an ivory blazer over a royal-blue silk top with gold piping. Soft cinematic light, photorealistic, no text, no logo."),
]: run(k,refs,pr)
for k in list(log):
    if 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),flush=True)
        im=r.get('images') or []
        if r.get('status')=='completed' and im: log[k]['url']=im[0]['url']; json.dump(log,open(LOG,'w')); download(log[k]['url'],k+'.png')
