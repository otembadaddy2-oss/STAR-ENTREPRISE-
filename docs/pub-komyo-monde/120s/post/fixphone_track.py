import cv2, numpy as np, json
N0,N1=223,420            # frames 1-indexées (t=7.4 .. 13.97)
K=256                    # t=8.5, quad manuel
Q=np.float32([[484,365],[532,363],[580,462],[532,462]])   # TL,TR,BR,BL
def rd(i): return cv2.imread(f'ph/full/{i:03d}.png')
def gray(i): return cv2.cvtColor(rd(i),cv2.COLOR_BGR2GRAY)
quads={K:Q.copy()}
def track(frm,to,step):
    q=Q.copy(); i=frm
    while i!=to:
        j=i+step; g0,g1=gray(i),gray(j)
        m=np.zeros_like(g0); cv2.fillConvexPoly(m,q.astype(np.int32),255); m=cv2.dilate(m,np.ones((21,21),np.uint8))
        p0=cv2.goodFeaturesToTrack(g0,150,0.01,4,mask=m)
        p1,st,_=cv2.calcOpticalFlowPyrLK(g0,g1,p0,None,winSize=(15,15),maxLevel=3)
        ok=st.ravel()==1; A,inl=cv2.estimateAffinePartial2D(p0[ok],p1[ok],method=cv2.RANSAC,ransacReprojThreshold=1.5)
        q=cv2.transform(q.reshape(-1,1,2),A).reshape(-1,2); quads[j]=q.copy(); i=j
track(K,N1,1); track(K,N0,-1)
json.dump({str(k):v.tolist() for k,v in quads.items()},open('ph/quads.json','w'))
print(len(quads))
# visual check
from PIL import Image
ts=[7.4,7.8,8.5,9.5,10.5,11.5,12.5,13.9]
tiles=[]
for t in ts:
    i=min(N1,int(round(t*30))+1); im=rd(i); q=quads[i].astype(np.int32); cv2.polylines(im,[q],True,(0,255,0),1)
    tiles.append(cv2.resize(im[330:510,430:630],None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC))
row1=np.hstack(tiles[:4]); row2=np.hstack(tiles[4:]); cv2.imwrite('ph/trk.jpg',np.vstack([row1,row2]))
