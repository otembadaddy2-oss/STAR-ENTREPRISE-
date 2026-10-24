import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('kf2_log.json'))
A='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
NEG="distorted face, extra teeth, blurry, text, watermark, morphing, different person, mouth closed while speaking"
J={
 's4':('k04_marie_appel','3adf4fdd-5bfd-45a2-875e-c5efccb018b9.mp3',5,"A young Congolese woman in a lively Brazzaville market holds her phone to her ear and listens, her face lights up with joy, then she lowers the phone a little, looks at the screen and speaks in French with natural, perfectly synchronized lip movement and warm expressive eyes. Natural small hand gesture, slight slow push-in, soft market ambience, same face and clothes."),
 's5':('k05_angele_cafe','c638829f-1a9c-4be2-a84b-69ebe4c4b759.mp3',4,"An elegant woman in a refined Paris cafe looks at her phone screen, her face opens in wonder and she speaks in French with natural, perfectly synchronized lip movement, a warm smile and a subtle expressive head movement. Gentle slow arc to the right, soft cafe light, same face and clothes."),
 's6a':('k06a_marie_regard','535d344c-630c-4f4b-868e-54c8dd2313be.mp3',3,"A young Congolese woman holds her phone at arm's length, eyes wide and shining, glancing slightly to the right as if her friend were in front of her, and speaks in French with natural, perfectly synchronized lip movement and a joyful smile. Slight slow dolly in, same face and clothes."),
 's6b':('k06b_angele_gauche','15eda86c-55e4-414a-9120-6702c2c6a76f.mp3',3,"An elegant woman in a Paris cafe looks at her phone, then turns her head toward the left of the frame with a confident warm smile and speaks in French with natural, perfectly synchronized lip movement. Slight slow dolly, same face and clothes."),
 's7':('k07_foel_montreal','5b3fa8c0-a3e4-46e5-89a5-969c57a5009d.mp3',4,"A man with glasses on a sofa in a warm Montreal living room at dawn picks up his smartphone, looks at it and lights up, then speaks in French with natural, perfectly synchronized lip movement and a friendly smile. Slow low-angle push-in, subtle TV ambience, same face and clothes."),
 's8':('k08_messie_tokyo','7b30d7a4-3d5e-4fba-88fb-44ad7f4691f9.mp3',5,"A man standing in a lively Tokyo street at night looks at his smartphone and beams, then speaks in French with natural, perfectly synchronized lip movement, cheerful expression and a small expressive hand gesture. Smooth slow arc to the left, neon bokeh, same face and clothes."),
}
LOG='lip6_log.json'; log=json.load(open(LOG)) if os.path.exists(LOG) else {}
only=sys.argv[2:] or list(J)
mode=sys.argv[1]
for k in only:
    kfn,aud,dur,pr=J[k]
    body=dict(image_url=kf[kfn]['url'],audio_url=A+aud,duration=dur,resolution='720p',prompt=pr,negative_prompt=NEG)
    if mode=='est':
        s,d=submit('/estimate/wan/v2.7/image-to-video',body); print(k,s,str(d)[:200]); continue
    if k not in log:
        s,d=submit('/wan/v2.7/image-to-video',body); print(k,'soumis',s,str(d)[:160],flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
if mode=='run':
    for k in only:
        e=log.get(k)
        if e and 'url' not in e:
            r=wait(e['id'],every=8,limit=500); print(k,r.get('status'),r.get('error'),flush=True)
            if r.get('status')=='completed' and r.get('video'):
                e['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
                try: download(e['url'],f'lip_{k}.mp4'); print(k,'téléchargé')
                except Exception as ex: print('download KO',ex)
