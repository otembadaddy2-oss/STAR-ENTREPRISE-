import json, os, sys, time
sys.path.insert(0,'..')
from hf import *
B='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
P={'marie':B+'caf2fdba-7657-4029-a4a6-be92402ea268.jpg','angele':B+'b0bc417c-766f-4703-bb02-2cddbb13c1d2.jpg','foel':B+'4be4b198-01a5-47ea-94ca-63fc0a004323.jpg','messie':B+'d47ceb2b-94a9-47e4-b42d-bfe26007ef27.jpg','sita':B+'d6e19af8-e9f2-4587-9ee5-662338e126ef.jpg','clemence':B+'8bcbec5c-ff9d-453a-b26a-fa4353181ba5.jpg'}
W={k:v['url'] for k,v in json.load(open('/home/user/STAR-ENTREPRISE-/docs/pub-komyo-monde/120s/images-cles/wide_ids.json')).items()}
S3='https://d8j0ntlcm91z4.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/hf_20261024_013418_19e4b376-df1e-4a6a-b272-9d6a34996f5e.png'
STYLE=" Photorealistic cinematic commercial still, natural skin texture, 35mm film look, shallow depth of field. Keep the exact face, hair, jewelry and clothing of the person in the portrait reference. No text, no logos, no watermark."
K={
 'k04_marie_appel': ([S3,P['marie']], "Image 1 is the Brazzaville street market at golden hour. Image 2 is Marie. Show Marie (exact face, bun hairstyle, gold hoop earrings, coral and turquoise wax dress) standing in that market street, holding a smartphone to her ear with one hand, smiling with joyful surprise, medium close-up, the market softly blurred behind her."+STYLE),
 'k05_angele_cafe': ([W['k03_paris_cafe'],P['angele']], "Image 1 is a high-end Paris cafe in winter at midday. Image 2 is Angèle. Show Angèle (exact face, smooth bob, cream blazer, pearl earrings) seated at a small cafe table by the window of that cafe, holding a smartphone upright in front of her with both hands and looking at its screen with a delighted, amazed smile, medium close-up, Haussmann boulevard blurred behind the window."+STYLE),
 'k06a_marie_regard': ([S3,P['marie']], "Image 1 is the Brazzaville street market at golden hour. Image 2 is Marie. Show Marie (exact face, bun hairstyle, gold hoop earrings, coral and turquoise wax dress) holding a smartphone at arm's length in front of her at chest height, looking at it and slightly toward the right side of the frame with a wide amazed happy smile, three-quarter view, medium close-up, the market softly blurred behind her."+STYLE),
 'k06b_angele_gauche': ([W['k03_paris_cafe'],P['angele']], "Image 1 is a high-end Paris cafe in winter at midday. Image 2 is Angèle. Show Angèle (exact face, smooth bob, cream blazer, pearl earrings) seated at the cafe table, holding a smartphone in one hand, turning her head and gaze toward the LEFT side of the frame with a warm confident smile, three-quarter view, medium close-up, coffee cup on the table, boulevard blurred behind."+STYLE),
 'k07_foel_montreal': ([W['k04_montreal_salon'],P['foel']], "Image 1 is a warm apartment living room in Montreal at dawn in winter, snow falling outside. Image 2 is Foel. Show Foel (exact face, round glasses, grey sweater) sitting on the sofa in that living room, holding a smartphone in one hand and smiling widely, the large TV with a fictional sports match behind him, black remote control on the coffee table in the foreground, medium shot, blue snowy dawn light through the window and warm lamp light."+STYLE),
 'k08_messie_tokyo': ([W['k05_tokyo_nuit'],P['messie']], "Image 1 is a lively Tokyo street at night with illuminated signs. Image 2 is Messie. Show Messie (exact face, short beard, dark coat over black turtleneck) standing in that Tokyo street at night, holding a smartphone in front of him at chest height and smiling with joy, medium close-up, neon and lantern bokeh behind him, no readable text on signs."+STYLE),
 'k09_sita_abidjan': ([W['k06_abidjan_boutique'],P['sita']], "Image 1 is a rich neighborhood boutique in Abidjan at 11 AM full of bread, hair extensions, sandals, accessories and fabrics. Image 2 is Sita. Show Sita (exact face, tied braids, black vest over a white blouse) behind the counter of that boutique, holding a smartphone in one hand and looking at it with a big joyful smile, a woman customer waiting on the left side of the frame, medium shot, warm daylight."+STYLE),
 'k12_clemence': ([P['clemence']], "Image 1 is Clémence. Show Clémence (exact face, blue top with gold piping, ivory suit) in an elegant premium lounge with soft blue and gold accents, looking directly at the camera with a warm sincere smile, medium close-up, 16:9 composition with her slightly right of center, soft cinematic light."+STYLE),
}
LOG='kf2_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
for k,(refs,pr) in K.items():
    if k in log: continue
    s,d=submit('/xai/grok-imagine-image-2.0',dict(prompt=pr,image_urls=refs,resolution='1k',aspect_ratio='16:9',quality='medium'))
    print(k,s,str(d)[:120],flush=True)
    if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
for k in K:
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),r.get('error'),flush=True)
        imgs=r.get('images') or []
        if r.get('status')=='completed' and imgs:
            log[k]['url']=imgs[0]['url']; json.dump(log,open(LOG,'w'))
            try: download(log[k]['url'],f'{k}.png')
            except Exception as e: print('download KO',k,e)
