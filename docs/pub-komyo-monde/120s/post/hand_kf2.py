import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('kf2_log.json'))
B='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
sita=B+'d6e19af8-e9f2-4587-9ee5-662338e126ef.jpg'
LOG='hand_kf2_log.json'; log=json.load(open(LOG)) if os.path.exists(LOG) else {}
pr=("Image 1 is a rich Abidjan neighborhood boutique with Sita behind the counter. Image 2 is Sita. Close-up from the front, slightly from the side. Sita (exact face, tied braids, black vest over a white blouse with puffed sleeves) holds her smartphone in her right hand, upright in the center-left of the frame; her whole arm is clearly hers: the forearm in the white puffed sleeve and the black vest extend naturally from the RIGHT edge of the frame, connected to her shoulder and body, which fill the right third of the frame. Her smiling face, softly out of focus, is at the top right, looking down at the phone with a joyful expression. The phone screen faces the camera and is filled entirely with a flat, perfectly uniform pure magenta color (#FF00FF), no reflections, no text, thin black bezels, fingers wrapped naturally around the phone, slightly tilted. Behind: the warm boutique shelves of colorful fabrics, softly blurred, glass counter in front. Photorealistic cinematic commercial still, shallow depth of field, 35mm film look. No watermark.")
if 'hand' not in log:
    s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,image_urls=[kf['k09_sita_abidjan']['url'],sita],resolution='1k',aspect_ratio='16:9',quality='medium'))
    print('hand',s,str(d)[:120],flush=True)
    if 'request_id' in d: log['hand']={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
e=log['hand']
if 'url' not in e:
    r=wait(e['id'],every=5,limit=300); print(r.get('status'),r.get('error'))
    imgs=r.get('images') or []
    if r.get('status')=='completed' and imgs:
        e['url']=imgs[0]['url']; json.dump(log,open(LOG,'w')); download(e['url'],'hand_kf2.png'); print('ok')
