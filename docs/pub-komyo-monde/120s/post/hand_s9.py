import sys; sys.path.insert(0,'.')
from callins import *
import cv2
DUR=3.8; N=int(DUR*FPS)
base=cv2.imread('hand_kf2.png'); base=cv2.resize(base,(W,H))
b,g,r=cv2.split(base.astype(int))
m=((r>150)&(b>100)&(g<110)&(r-g>90)&(b-g>60)).astype(np.uint8)*255
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8)); m=cv2.dilate(m,np.ones((3,3),np.uint8),iterations=1)
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); c=max(cs,key=cv2.contourArea)
quad=np.array(sorted(cv2.approxPolyDP(c,0.02*cv2.arcLength(c,True),True).reshape(-1,2).tolist(),key=lambda p:p[1]),dtype=np.float32)
top=sorted(quad[:2].tolist()); bot=sorted(quad[2:].tolist())
dst=np.array([top[0],top[1],bot[1],bot[0]],np.float32)   # TL,TR,BR,BL
src=np.array([[0,0],[SW,0],[SW,SH],[0,SH]],np.float32)
Hm=cv2.getPerspectiveTransform(src,dst)
maskf=cv2.GaussianBlur(np.zeros((H,W),np.uint8)+m,(0,0),1.1).astype(np.float32)/255.0
mask3=np.dstack([maskf]*3)
# dé-magenta des bords : on remplace aussi les pixels très magenta hors masque
fr={}
fr['marie']=frames('lip2_s6a.mp4',0.45,2.95,(245,0,675,720),(500,560))
fr['angele']=frames('lip2_s5.mp4',0.6,3.4,(330,10,810,490),(500,560))
fr['foel']=frames('lip2_s7.mp4',3.9,5.9,(280,0,760,540),(500,560)) if False else frames('lip_s7.mp4',2.2,3.95,(60,20,560,580),(500,560))
fr['messie']=frames('lip_s8.mp4',1.2,4.6,(350,10,830,490),(500,560))
LB=['MARIE · BRAZZAVILLE','ANGÈLE · PARIS','FOEL · MONTRÉAL','MESSIE · TOKYO']
cx,cy=float(dst[:,0].mean()),float(dst[:,1].mean())
def frame(i):
    t=i/FPS
    tiles=[boom(fr[k],i+7*j) for j,k in enumerate(['marie','angele','foel','messie'])]
    scr=screen_grid(tiles,LB,'00:%02d'%(21+int(t)),online=5)
    wp=cv2.warpPerspective(cv2.cvtColor(np.array(scr),cv2.COLOR_RGB2BGR),Hm,(W,H),flags=cv2.INTER_AREA if False else cv2.INTER_LINEAR)
    comp=(base.astype(np.float32)*(1-mask3)+wp.astype(np.float32)*mask3)
    # caméra : approche lente + petit bougé de la main
    u=clamp(t/DUR); z=1.0+0.62*ease(u)
    e=ease(clamp(u*1.15))
    ox=W/2+(cx-W/2)*e+3*math.sin(t*2.1); oy=H/2+(cy-H/2)*e+2.5*math.sin(t*2.7)
    ox=min(max(ox,W/(2*z)),W-W/(2*z)); oy=min(max(oy,H/(2*z)),H-H/(2*z))
    M=np.float32([[z,0,W/2-ox*z],[0,z,H/2-oy*z]])
    out=cv2.warpAffine(comp,M,(W,H),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
    return Image.fromarray(cv2.cvtColor(out.clip(0,255).astype(np.uint8),cv2.COLOR_BGR2RGB))
if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='test':
        for tt in (0.2,1.8,3.6): frame(int(tt*FPS)).save(f'/tmp/hs9_{tt}.png')
    else:
        p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart','hand_s9.mp4'],stdin=subprocess.PIPE)
        for i in range(N): p.stdin.write(frame(i).tobytes())
        p.stdin.close(); p.wait(); print('ok')
