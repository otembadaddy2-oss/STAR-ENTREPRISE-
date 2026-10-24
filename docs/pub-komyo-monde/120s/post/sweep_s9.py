import sys, numpy as np, subprocess, math
from PIL import Image, ImageFilter
W,H,FPS=1280,720,24
FF=open('../ffpath').read().strip()
src=sys.argv[1] if len(sys.argv)>1 else 'k09_sita_abidjan.png'
im=Image.open(src).convert('RGB').resize((W,H),Image.LANCZOS)
DUR=3.4; N=int(DUR*FPS)
ease=lambda x: x*x*(3-2*x)
clamp=lambda x,a=0,b=1: max(a,min(b,x))
def cam(t):
    """(cx,cy,zoom) : de la cliente/vitre (gauche) vers les étagères puis le téléphone de Sita"""
    u=clamp(t/DUR)
    # phase 1 (0–0.62) glissement gauche -> droite ; phase 2 (0.62–1) approche du téléphone
    if u<0.62:
        a=ease(u/0.62); cx=250+(1010-250)*a; cy=330; z=1.55
    else:
        b=ease((u-0.62)/0.38); cx=1010+(540-1010)*b; cy=330+(430-330)*b; z=1.55+(2.5-1.55)*b
    return cx,cy,z
def frame(t):
    cx,cy,z=cam(t); w=W/z; h=H/z
    x0=clamp(cx-w/2,0,W-w); y0=clamp(cy-h/2,0,H-h)
    c=im.crop((int(x0),int(y0),int(x0+w),int(y0+h))).resize((W,H),Image.BICUBIC)
    # flou de bougé horizontal selon la vitesse
    c0=cam(t-0.04)[0]; c1=cam(t+0.04)[0]; sp=abs(c1-c0)*z/0.08/FPS
    a=np.asarray(c,np.float32); k=int(min(60,sp*1.3))
    if k>2:
        acc=np.zeros_like(a)
        for s in range(-k//2,k//2+1,max(1,k//8)): acc+=np.roll(a,s,axis=1)
        n=len(range(-k//2,k//2+1,max(1,k//8))); a=acc/n
    return Image.fromarray(a.clip(0,255).astype('uint8'))
if __name__=='__main__':
    p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart','sweep_s9.mp4'],stdin=subprocess.PIPE)
    for i in range(N): p.stdin.write(frame(i/FPS).tobytes())
    p.stdin.close(); p.wait(); print('ok')
