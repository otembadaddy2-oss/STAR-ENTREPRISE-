import subprocess, sys, os
FF=open('../ffpath').read().strip()
M='KOMYO_monde_en_mouvement_120s_16x9_v4.mp4'
# (début, fin, mode crop|fit, centre x du recadrage, fondu d'entrée)
V60=[(0.4,2.6,'crop',.50,0),(6.9,10.64,'crop',.30,.3),(10.64,12.95,'crop',.38,.1),(17.2,20.9,'crop',.30,.25),
     (21.5,22.87,'fit',.5,.25),(22.88,28.87,'crop',.50,.1),(28.88,31.42,'fit',.5,.1),(31.45,35.4,'crop',.47,.1),(35.45,38.4,'crop',.50,.1),
     (46.7,51.3,'crop',.38,.2),(51.5,56.3,'crop',.50,.2),(56.5,70.1,'crop',.52,.2),(105.4,115.4,'fit',.5,.4)]
V30=[(17.7,20.9,'crop',.30,0),(21.5,22.87,'fit',.5,.25),(22.88,28.87,'crop',.50,.1),(28.88,31.42,'fit',.5,.1),(31.45,35.4,'crop',.47,.1),
     (35.45,38.4,'crop',.50,.1),(75.5,78.3,'crop',.50,.2),(107.8,115.4,'fit',.5,.4)]
V15=[(17.2,20.6,'crop',.30,0),(75.5,78.3,'crop',.50,.2),(106.6,115.4,'fit',.5,.4)]
def seg_filter(i,t0,t1,mode,cx,fmt):
    base=f'[{i}:v]trim={t0}:{t1},setpts=PTS-STARTPTS,fps=24,scale=1280:720,setsar=1,format=yuv420p'
    if fmt=='16x9': return base+f'[v{i}]'
    x=int(min(max(cx*1280-360,0),560))
    if fmt=='1x1':
        if mode=='crop': return base+f',crop=720:720:{x}:0,scale=1080:1080[v{i}]'
        return base+f',split[a{i}][b{i}];[a{i}]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=28:4,eq=brightness=-0.12[bg{i}];[b{i}]scale=1080:608[fg{i}];[bg{i}][fg{i}]overlay=0:236[v{i}]'
    H=1920
    if mode=='crop': return base+f',crop=720:720:{x}:0,scale=1080:1080,split[a{i}][b{i}];[a{i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:6,eq=brightness=-0.15[bg{i}];[bg{i}][b{i}]overlay=0:420[v{i}]'
    return base+f',split[a{i}][b{i}];[a{i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:6,eq=brightness=-0.15[bg{i}];[b{i}]scale=1080:608[fg{i}];[bg{i}][fg{i}]overlay=0:656[v{i}]'
def build(name,spec,fmt,crf=23):
    n=len(spec); inp=[]; fc=[]
    for i,(t0,t1,mode,cx,d) in enumerate(spec):
        inp+=['-i',M]; fc.append(seg_filter(i,t0,t1,mode,cx,fmt))
        fc.append(f'[{i}:a]atrim={t0}:{t1},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo[a_{i}]')
    cur='v0'; acur='a_0'; L=spec[0][1]-spec[0][0]
    for i in range(1,n):
        t0,t1,mode,cx,d=spec[i]; d=max(d,0.1); off=L-d
        fc.append(f'[{cur}][v{i}]xfade=transition=fade:duration={d}:offset={off:.3f},setpts=PTS-STARTPTS,settb=1/24,fps=24[xv{i}]'); cur=f'xv{i}'
        fc.append(f'[{acur}][a_{i}]acrossfade=d={d}:c1=tri:c2=tri[xa{i}]'); acur=f'xa{i}'
        L=L+(t1-t0)-d
    fc.append(f'[{acur}]afade=t=out:st={L-0.5:.2f}:d=0.5,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=1.0[aout]')
    fc.append(f'[{cur}]tpad=stop_mode=clone:stop_duration=1.0[vend]'); cur='vend'; L+=1.0
    out=f'{name}_{fmt}.mp4'
    subprocess.run([FF,'-y','-loglevel','error']+inp+['-filter_complex',';'.join(fc),'-map',f'[{cur}]','-map','[aout]','-c:v','libx264','-crf',str(crf),'-preset','medium','-profile:v','high','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','44100','-movflags','+faststart',out],check=True)
    print(out,round(L,2),'s',round(os.path.getsize(out)/1e6,1),'Mo',flush=True)
if __name__=='__main__':
    for name,spec in (('KOMYO_60s',V60),('KOMYO_30s',V30),('KOMYO_15s',V15)):
        for fmt in sys.argv[1:] or ('16x9',): build(name,spec,fmt)
