import json, os, sys
sys.path.insert(0,'..')
from hf import *
LOG='sweep_kling_log.json'; log=json.load(open(LOG)) if os.path.exists(LOG) else {}
img='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/94bea1b6-e342-465e-8975-183fdb7919cb.png'
pr=("Cinematic handheld camera move in a lively Abidjan boutique. The camera starts on the smiling shopkeeper holding her phone, then quickly glides to the left past the customer's back, revealing the shelves of colorful fabrics and the wooden wall behind the customer, then the bright street seen through the shop window, with passers-by outside. Then the camera sweeps smoothly back to the right across the shelves and closes in on the shopkeeper's hand holding the smartphone in the lower center, the phone screen facing the camera. Natural motion blur during the fast move, warm light, boutique ambience. No people appear or disappear, same faces and clothes.")
if 'sw' not in log:
    s,d=submit('/kling-video/v3.0/std/image-to-video',dict(prompt=pr,image_url=img,duration=6,sound='off',cfg_scale=0.5)); print(s,str(d)[:140],flush=True)
    if 'request_id' in d: log['sw']={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
e=log['sw']
if 'url' not in e:
    r=wait(e['id'],every=8,limit=560); print(r.get('status'),r.get('error'),flush=True)
    if r.get('status')=='completed' and r.get('video'):
        e['url']=r['video']['url']; json.dump(log,open(LOG,'w')); download(e['url'],'clip_sweep_kling.mp4'); print('ok')
