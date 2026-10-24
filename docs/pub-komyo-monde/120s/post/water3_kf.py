import json, os, sys
sys.path.insert(0,'..')
from hf import *
B='https://d2ol7oe51mr4n9.cloudfront.net/user_3IWGn6PBRdP6WmTgw8zdtH90Ncx/'
SITA=B+'d6e19af8-e9f2-4587-9ee5-662338e126ef.jpg'
W=json.load(open('/home/user/STAR-ENTREPRISE-/docs/pub-komyo-monde/120s/images-cles/wide_ids.json'))['k06_abidjan_boutique']['url']
LOG='water3_kf_log.json'
log=json.load(open(LOG)) if os.path.exists(LOG) else {}
def run(k,refs,pr):
    if k not in log:
        body=dict(prompt=pr,resolution='1k',aspect_ratio='16:9',quality='medium')
        if refs: body['image_urls']=refs
        s,d=submit('/xai/grok-imagine-image-2.0',body); print(k,s,flush=True)
        if 'request_id' in d: log[k]={'id':d['request_id']}; json.dump(log,open(LOG,'w'))
    if k in log and 'url' not in log[k]:
        r=wait(log[k]['id'],every=5,limit=300); print(k,r.get('status'),flush=True)
        im=r.get('images') or []
        if r.get('status')=='completed' and im:
            log[k]['url']=im[0]['url']; json.dump(log,open(LOG,'w')); download(log[k]['url'],k+'.png')
STYLE=" Photorealistic, natural skin and light, shallow depth of field, no text, no logo. The water is completely colorless and transparent like tap water: NOT milky, NOT white, NOT blue, no foam, no froth."
run('wa_sita_verse',[W,SITA],"Image 1 is a rich neighborhood boutique in Abidjan at 11 AM. Image 2 is Sita. Show Sita (exact face, tied braids, black vest over a white blouse) behind the counter of that boutique, serving herself water: she holds a clear transparent drinking glass in her left hand at chest height and pours water from a glass pitcher with her right hand. A continuous thin clear stream of water falls straight from the pitcher spout down into the glass and reaches the water surface inside the glass, with small ripples where it lands; the glass is one third full. Medium close-up on her hands and the glass, her smiling face softly blurred behind, boutique shelves blurred in the background."+STYLE)
A=log['wa_sita_verse']['url']
run('wb_macro_filet',[A],"Same scene as the reference image, now an extreme macro close-up on the glass held in Sita's hand: a thin continuous stream of clear water falls from the top of the frame all the way down into the water inside the glass and enters the water surface, small ripples and a few tiny bubbles spread from the entry point. The glass wall and the clear water act as a lens: through them the boutique shelves, colorful fabrics and bread behind are seen blurred, warm and magnified. Golden warm daylight."+STYLE)
run('wc_dans_le_verre',[A],"Extreme macro from inside a drinking glass of clear colorless water, looking up through the water toward the surface. The surface above gently ripples where the stream arrives. Through the water and the glass wall, the surroundings are seen as a blurred, magnified and refracted reflection: warm boutique shelves, colorful fabrics, and the soft blurred shape of a smiling woman's face above like through a lens. A few tiny bubbles rising. Warm golden light. It is a small glass of clear drinking water, NOT an ocean, no blue-green sea color, no sun rays underwater."+STYLE)
