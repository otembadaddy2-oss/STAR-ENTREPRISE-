import sys; sys.path.insert(0,'.')
from callins import *
DUR=3.6; N=int(DUR*FPS)
bg=Image.open('k09_sita_abidjan.png').convert('RGB').resize((W,H)).filter(ImageFilter.GaussianBlur(5))
bg=Image.eval(bg,lambda v:int(v*0.85))
skin=(100,64,46)
fr={}
fr['marie']=frames('lip2_s6a.mp4',0.45,2.95,(245,0,675,720),(500,560))
fr['angele']=frames('lip2_s5.mp4',0.6,3.4,(330,10,810,490),(500,560))
fr['foel']=frames('lip_s7.mp4',2.2,3.95,(60,20,560,580),(500,560))
fr['messie']=frames('lip_s8.mp4',1.2,4.6,(350,10,830,490),(500,560))
LB=['MARIE · BRAZZAVILLE','ANGÈLE · PARIS','FOEL · MONTRÉAL','MESSIE · TOKYO']
def frame(i):
    t=i/FPS
    tiles=[boom(fr[k],i+7*j) for j,k in enumerate(['marie','angele','foel','messie'])]
    scr=screen_grid(tiles,LB,'00:%02d'%(21+int(t)),online=5)
    return compose(bg,scr,t,DUR,skin,start_y=0.0,rot=2,tilt=-0.03,cx=0.64,ph_h=700,zoom_end=1.08,top=0.03)
if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='test':
        for tt in (0.2,1.5,3.4): frame(int(tt*FPS)).save(f'/tmp/ins9_{tt}.png')
    else:
        p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','ins_s9.mp4'],stdin=subprocess.PIPE)
        for i in range(N): p.stdin.write(frame(i).tobytes())
        p.stdin.close(); p.wait(); print('ok')
