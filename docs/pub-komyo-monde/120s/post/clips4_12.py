import json, os, sys
sys.path.insert(0,'..')
from hf import *
kf=json.load(open('kf2_log.json')); wide=json.load(open('/home/user/STAR-ENTREPRISE-/docs/pub-komyo-monde/120s/images-cles/wide_ids.json'))
U=lambda k: kf[k]['url']
S3='https://d8j0ntlcm91z4.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/hf_20261024_013418_19e4b376-df1e-4a6a-b272-9d6a34996f5e.png'
P='/kling-video/v3.0/std/image-to-video'
NOM=" Speak natural, clear French, slowly, every word fully pronounced, natural lip sync. No music."
J={
 's4': (U('k04_marie_appel'),7,"Marie holds the phone to her ear in the lively Brazzaville market at golden hour, listens, her face lights up with joy, then she lowers the phone slightly and says in French with a warm lively young voice: « Angèle ! Oui, je t'entends ! Attends, j'ouvre Ko-myo. » (the app name is two syllables, 'ko-myo'). Slight slow push-in, soft market ambience."+NOM),
 's5': (U('k05_angele_cafe'),6,"Angèle sits in a refined Paris cafe, looks at her phone screen and her face opens in wonder; she says in French with an elegant, warm, slightly low female Parisian voice: « Marie ! Maintenant, je te vois ! ». Gentle slow arc to the right around her, soft cafe murmurs, a cup set down in the distance."+NOM),
 's6a': (U('k06a_marie_regard'),5,"Marie looks at the phone at arm's length, eyes wide and shining, glancing slightly to the right of the frame as if her friend were right in front of her, and says in French with the same warm lively young voice: « Comme si tu étais devant moi ! ». Slight slow dolly in, market ambience."+NOM),
 's6b': (U('k06b_angele_gauche'),5,"Angèle looks at her phone, then turns her head toward the left of the frame with a confident warm smile and says in French with an elegant, warm, slightly low female Parisian voice: « Reste là, j'appelle Foël. » (Foël is pronounced 'fo-ell'). Slight slow dolly, soft cafe ambience."+NOM),
 's7': (U('k07_foel_montreal'),10,"Foel sits on the sofa in a warm Montreal living room at dawn while snow falls outside, a sports match plays on the TV, a notification chime sounds; he picks up his smartphone, looks at it and lights up, saying in French with a friendly middle-aged man's voice with a light Quebec accent: « Angèle ! Enfin, vous êtes là ! ». Slow low-angle push-in past the black remote on the coffee table, subtle TV and wind ambience."+NOM),
 's8': (U('k08_messie_tokyo'),10,"Messie stands in a lively Tokyo street at night, a phone notification sounds, he looks at his smartphone and beams, saying in French with a deep warm cheerful man's voice: « Je suis connecté ! Et Sita, elle est où ? ». Smooth slow arc to the left around him, neon bokeh, Japanese night city ambience."+NOM),
 's9': (U('k09_sita_abidjan'),12,"In a lively Abidjan boutique, the customer on the left says in French with an older woman's voice: « Madame Sita, le pain s'il vous plaît. ». Sita, smiling behind the counter with her phone in hand, answers with a lively warm Ivorian woman's voice: « Un instant, madame ! », then looks at the phone screen and says joyfully: « Abidjan est là, hein ! Nous, on était déjà connectés ! ». Slow gentle arc around Sita, boutique ambience and laughter."+NOM),
 's10': (wide['k07_eau_verre']['url'],8,"Ultra-realistic macro of clear water being poured into a transparent glass, physically accurate flow, tiny bubbles rising, soft highlights, slow push-in, refracted warm boutique light. Detailed water sound, faint boutique ambience, no speech, no music."),
 's11a': (S3,3,"Marie lowers the BISSA POP pack from her lips, smiles warmly at the camera and raises the pack toward the camera in a cheerful toast. No speech."),
 's11b': (U('k06b_angele_gauche'),3,"Angèle smiles at her phone and lifts her coffee cup toward the camera in a graceful toast. No speech."),
 's11c': (U('k07_foel_montreal'),3,"Foel smiles broadly at his phone and gives a warm nod. No speech."),
 's11d': (U('k08_messie_tokyo'),3,"Messie gives a small friendly wave to his phone, smiling. No speech."),
 's12': (U('k12_clemence'),7,"Clémence looks at the camera with a warm sincere smile and says in French with a warm, elegant, reassuring female presenter voice: « Je vous l'avais dit : vous êtes formidables. Voici notre surprise. ». Very slow dolly in, soft golden light."+NOM),
}
LOG='clips4_12_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
for k,(img,dur,pr) in J.items():
    if k in log: continue
    s,d=submit(P,dict(prompt=pr,image_url=img,duration=dur,sound='off' if k.startswith('s11') else 'on',cfg_scale=0.5))
    print(k,s,str(d)[:100],flush=True)
    if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
    else: print('ECHEC',k,d,flush=True)
for k in J:
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=8,limit=900); print(k,r.get('status'),r.get('error'),flush=True)
        if r.get('status')=='completed' and r.get('video'):
            log[k]['url']=r['video']['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],f'clip_{k}.mp4')
            except Exception as e: print('download KO',k,e,flush=True)
print('FIN',flush=True)
