import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('kf2_log.json'))
A='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
NEG="distorted face, extra teeth, blurry, text, watermark, morphing, different person, bulging eyes, wide staring eyes, scary expression, subtitles"
J={
 's2A':(A+'e8754d9f-d206-4868-9116-2cc001e654da.png','7e875a25-0b67-4065-a760-71fb560393f0.mp3',4,"Close shot of a young Congolese woman at a street stall in Brazzaville at golden hour, looking toward the older saleswoman just out of frame on the right. She first smiles and waits half a second, then asks in French with warm friendly voice and natural synchronized lip movement, clear articulation of every word, a small friendly nod. Soft market ambience, slight slow push-in, same face and clothes."),
 's2B':(A+'482e5f31-f934-47fc-83e7-94863311ee54.png','0332c733-9a9e-4b81-88e3-44990b7fdc7e.mp3',3,"Close shot of an older African saleswoman in a colorful headscarf at her stall in Brazzaville at golden hour, looking toward the young woman just out of frame on the left. She first listens with a kind smile, then answers clearly in French with natural synchronized lip movement and a gentle confident nod, hand slightly raised showing the price. Soft market ambience, slight slow push-in, same face and clothes."),
 's3':(A+'4c4a5d51-54ca-4c33-baa9-400f9a3b3f5c.png','df72eae6-4bae-4ee8-837a-8d8c53976afd.mp3',6,"Medium close-up. A young Congolese woman drinks from the BISSA POP pack through the red straw, eyes closed with pleasure, for a couple of seconds. Then she lowers the pack, opens her eyes, smiles warmly at the older saleswoman and says in French, relieved and delighted, with natural synchronized lip movement: 'Ah, ça fait du bien !'. Warm golden light, soft market ambience, same face and clothes."),
 's9n':(kf['k09_sita_abidjan']['url'],'8c94c736-19e6-4804-82bf-727311fbd573.mp3',14,"In a lively Abidjan boutique, the shopkeeper behind the counter first looks down at her phone while a customer in the foreground (seen from behind) speaks off-camera. Then she lifts her eyes to the customer, says 'Un instant, madame, hé !' with a small friendly hand wave, then looks back at her phone, surprised and delighted by an incoming video call, and with a joyful playful expression and lively gestures says her line to the friends on the phone screen, eyes on the phone screen, natural synchronized lip movement. Slow gentle arc, same face and clothes."),
}
LOG='lip8_log.json'; log=json.load(open(LOG)) if os.path.exists(LOG) else {}
only=sys.argv[1:] or list(J)
for k in only:
    img,aud,dur,pr=J[k]
    if k not in log:
        s,d=submit('/wan/v2.7/image-to-video',dict(image_url=img,audio_url=A+aud,duration=dur,resolution='720p',prompt=pr,negative_prompt=NEG))
        print(k,'soumis',s,str(d)[:160],flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
for k in only:
    e=log.get(k)
    if e and 'url' not in e:
        r=wait(e['id'],every=8,limit=560); print(k,r.get('status'),r.get('error'),flush=True)
        if r.get('status')=='completed' and r.get('video'):
            e['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
            try: download(e['url'],f'lip3_{k}.mp4'); print(k,'téléchargé',flush=True)
            except Exception as ex: print('download KO',ex)
