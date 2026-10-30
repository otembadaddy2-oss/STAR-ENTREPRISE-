import sys; sys.path.insert(0,'.')
from callins import *
DUR=3.2; N=int(DUR*FPS)
bg=Image.open('fr/s6b_last.png').convert('RGB')
bgb=bg.filter(ImageFilter.GaussianBlur(2)); 
skin=(112,72,52)
marie=frames('lip2_s6a.mp4',0.45,2.95,(245,0,675,720),(512,856))
ang=frames('lip2_s5.mp4',0.6,3.4,(420,40,720,440),(300,400))
def frame(i):
    t=i/FPS
    scr=screen_1to1(boom(marie,i),boom(ang,i),'MARIE · BRAZZAVILLE','00:%02d'%(8+int(t)))
    return compose(bgb,scr,t,DUR,skin,start_y=1.0,rot=-3,tilt=0.05,cx=0.62,ph_h=930,zoom_end=1.06,top=0.07)
if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='test':
        for tt in (0.2,0.6,1.5,3.0): frame(int(tt*FPS)).save(f'/tmp/ins_{tt}.png')
    else:
        p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','ins_s6b.mp4'],stdin=subprocess.PIPE)
        for i in range(N): p.stdin.write(frame(i).tobytes())
        p.stdin.close(); p.wait(); print('ok')
