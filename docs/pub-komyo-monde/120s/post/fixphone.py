import sys, json, subprocess; sys.path.insert(0,'.')
from callins import *
import cv2
Q={int(k):np.float32(v) for k,v in json.load(open('ph/quads.json')).items()}
N0,N1=223,420
fr={}
fr['marie']=frames('lip2_s6a.mp4',0.45,2.95,(245,0,675,720),(500,560))
fr['angele']=frames('lip2_s5.mp4',0.6,3.4,(330,10,810,490),(500,560))
fr['foel']=frames('lip_s7.mp4',2.2,3.95,(60,20,560,580),(500,560))
fr['messie']=frames('lip_s8.mp4',1.2,4.6,(350,10,830,490),(500,560))
LB=['MARIE · BRAZZAVILLE','ANGÈLE · PARIS','FOEL · MONTRÉAL','MESSIE · TOKYO']
src=np.float32([[0,0],[SW,0],[SW,SH],[0,SH]])
def screen(i30):
    i=int((i30-N0)*24/30)
    tiles=[boom(fr[k],i+7*j) for j,k in enumerate(['marie','angele','foel','messie'])]
    return cv2.cvtColor(np.array(screen_grid(tiles,LB,'00:%02d'%(21+int(i30/30)),online=5)),cv2.COLOR_RGB2BGR)
def comp(i):
    bg=cv2.imread(f'ph/full/{i:03d}.png')
    if i<N0 or i>N1: return bg
    q=Q[i]; c=q.mean(0); qi=c+(q-c)*0.955            # léger retrait : la tranche du téléphone reste visible
    Hm=cv2.getPerspectiveTransform(src,qi.astype(np.float32))
    wp=cv2.warpPerspective(screen(i),Hm,(bg.shape[1],bg.shape[0]),flags=cv2.INTER_AREA)
    m=np.zeros(bg.shape[:2],np.uint8); cv2.fillConvexPoly(m,qi.astype(np.int32),255,cv2.LINE_AA)
    # doigts devant l'écran : composantes « peau » qui dépassent du quad
    ycc=cv2.cvtColor(bg,cv2.COLOR_BGR2YCrCb); skin=((ycc[...,1]>135)&(ycc[...,1]<185)&(ycc[...,2]>75)&(ycc[...,2]<130)&(ycc[...,0]>35)).astype(np.uint8)
    skin=cv2.morphologyEx(skin,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    qm=np.zeros_like(skin); cv2.fillConvexPoly(qm,q.astype(np.int32),1); qm=cv2.dilate(qm,np.ones((5,5),np.uint8))
    er=cv2.erode(skin,np.ones((9,9),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(er,connectivity=4)
    seed=np.zeros_like(skin)
    for k in range(1,n):
        comp_k=(lab==k); out=(comp_k&(qm==0)).sum()
        if out>60: seed|=comp_k.astype(np.uint8)
    hand=seed.copy()
    for _ in range(6): hand=cv2.dilate(hand,np.ones((3,3),np.uint8))&skin   # on récupère les bords perdus par l'érosion
    # contrôle couleur : on ne garde dans le quad que la peau proche de la couleur des doigts visibles hors écran
    lab_=cv2.cvtColor(bg,cv2.COLOR_BGR2LAB).astype(np.float32)
    outside=(hand>0)&(qm==0)
    if outside.sum()>50:
        ref=np.median(lab_[outside],axis=0); dist=np.linalg.norm(lab_-ref,axis=2)
        hand=((hand>0)&((qm==0)|(dist<16))).astype(np.uint8)
    # le haut de l'écran (zone du « fantôme ») n'est jamais restauré
    Hi=np.linalg.inv(Hm); yy,xx=np.mgrid[0:bg.shape[0],0:bg.shape[1]].astype(np.float32)
    ww=Hi[2,0]*xx+Hi[2,1]*yy+Hi[2,2]; vv=(Hi[1,0]*xx+Hi[1,1]*yy+Hi[1,2])/ww
    hand=hand*((vv/SH>0.26)|(qm==0))
    hand=cv2.dilate(hand.astype(np.uint8),np.ones((3,3),np.uint8))
    a=cv2.GaussianBlur(m,(0,0),0.7).astype(np.float32)/255.0
    a*= (1-cv2.GaussianBlur(hand.astype(np.float32),(0,0),0.8))
    a*=min(1.0,(i-N0+1)/4.0)                          # apparition en 4 images
    a=a[...,None]
    return (bg*(1-a)+wp*a).clip(0,255).astype(np.uint8)
if __name__=='__main__':
    if sys.argv[1]=='test':
        ts=[7.5,8.5,9.5,10.5,11.5,12.5,13.5,13.95]; tl=[]
        for t in ts: tl.append(cv2.resize(comp(min(N1,int(round(t*30))+1))[330:510,430:630],None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC))
        cv2.imwrite('ph/test.jpg',np.vstack([np.hstack(tl[:4]),np.hstack(tl[4:])]))
    else:
        p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s','1280x720','-r','30','-i','-','-i','lip3_s9n.mp4','-map','0:v','-map','1:a','-c:v','libx264','-crf','14','-pix_fmt','yuv420p','-profile:v','high','-c:a','copy','-shortest','lip3_s9n_fix.mp4'],stdin=subprocess.PIPE)
        for i in range(1,421): p.stdin.write(comp(i).tobytes())
        p.stdin.close(); p.wait(); print('ok')
