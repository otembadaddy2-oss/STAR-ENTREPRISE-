import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('kf2_log.json'))
A='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
NEG="distorted face, extra teeth, blurry, text, watermark, morphing, different person, bulging eyes, wide staring eyes, scary expression"
J={
 's4':('k04_marie_appel','993f78b3-743a-4043-99a3-5c2afe4fdb59.mp3',6,"A young Congolese woman in a lively Brazzaville market at golden hour is on a normal voice phone call, not a video call. She holds the phone to her ear, listens, then says the first words 'Angèle ! Oui, je t'entends !' with natural synchronized lip movement and joy, phone still at her ear. Then she lowers the phone from her ear, looks down at its screen and says 'Attends, j'ouvre Komyo' with her eyes on the screen. Then she stops speaking, gently taps the screen with her thumb to open the app, smiling with anticipation. Slight slow push-in, soft market ambience, same face and clothes."),
 's5':('k05_angele_cafe','c638829f-1a9c-4be2-a84b-69ebe4c4b759.mp3',4,"An elegant woman in a refined Paris cafe holds her phone in front of her and looks straight at its screen the whole time, as if seeing her friend on a video call, radiant joyful poised smile, relaxed natural eyes. She says her line with natural synchronized lip movement, eyes staying on the screen, never looking away. Gentle slow arc to the right, soft cafe light, same face and clothes."),
 's6a':('k06a_marie_regard','535d344c-630c-4f4b-868e-54c8dd2313be.mp3',3,"A young Congolese woman holds her phone at arm's length and looks at it with a soft, happy, relaxed expression, normal natural eye size, warm affectionate smile, slightly touched. She speaks in French with natural synchronized lip movement. Slight slow dolly in, same face and clothes."),
 's6b':('k06b_angele_gauche','78b29e82-24ea-49a8-828c-6f67e9308a89.mp3',4,"An elegant woman in a Paris cafe looks at the screen of her phone with a confident warm smile, her eyes on the screen, and says her line in French with natural synchronized lip movement. While she speaks the camera continues a slow smooth arc to the right and glides behind her, drifting toward her shoulder. Same face and clothes."),
 's7':('k07_foel_montreal','13549f9b-1b6d-43c3-98ac-43e10f072459.mp3',6,"A man with glasses on a sofa in a warm Montreal living room at dawn first watches the football match on the large TV with relaxed interest, head turned toward the TV, not speaking. Then a notification chimes, he turns his head, looks down at the smartphone in his hand, brings the phone closer to his face with delighted surprise and says his line looking at the phone screen with a warm friendly smile and natural synchronized lip movement. Slow low-angle push-in, same face and clothes."),
 's7b':('k07_foel_montreal','13549f9b-1b6d-43c3-98ac-43e10f072459.mp3',6,"A man with glasses sits on a sofa in a warm Montreal living room at dawn. At first he watches the football match on the large TV, head turned toward the TV, not speaking, wide shot. Then a notification chimes, he turns his head and looks down at the smartphone in his hand, raises the phone naturally in front of him, and from that moment his eyes stay fixed on the phone screen, never looking at the camera. He says his line while looking at the phone screen with a delighted warm smile, natural synchronized lip movement and slight nods, as if seeing his friend on a video call. The camera slowly pushes in from the wide shot to a medium close-up on his face and the phone, same face and clothes."),
 's9':('k09_sita_abidjan','@@S9@@.mp3',10,"In a lively Abidjan boutique, the shopkeeper behind the counter first looks down at her phone while a customer in the foreground (seen from behind, her lips not visible) speaks off-camera. Then the shopkeeper says 'Un instant, madame !' lifting her eyes to the customer with a small friendly hand wave, then looks back at her phone and, with a joyful playful expression and lively gestures, says her line with natural synchronized lip movement, eyes on the phone screen. Slow gentle arc, same face and clothes."),
}
LOG='lip7_log.json'; log=json.load(open(LOG)) if os.path.exists(LOG) else {}
mode=sys.argv[1]; only=sys.argv[2:] or list(J)
if os.path.exists('s9_media.txt'): J['s9']=J['s9'][:1]+(open('s9_media.txt').read().strip()+'.mp3',)+J['s9'][2:]
for k in only:
    kfn,aud,dur,pr=J[k]
    body=dict(image_url=kf[kfn]['url'],audio_url=A+aud,duration=dur,resolution='720p',prompt=pr,negative_prompt=NEG)
    if mode=='run' and k not in log:
        s,d=submit('/wan/v2.7/image-to-video',body); print(k,'soumis',s,str(d)[:140],flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
if mode=='run':
    for k in only:
        e=log.get(k)
        if e and 'url' not in e:
            r=wait(e['id'],every=8,limit=520); print(k,r.get('status'),r.get('error'),flush=True)
            if r.get('status')=='completed' and r.get('video'):
                e['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
                try: download(e['url'],f'lip2_{k}.mp4'); print(k,'téléchargé')
                except Exception as ex: print('download KO',ex)
