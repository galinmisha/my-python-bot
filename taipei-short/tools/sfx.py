import json, numpy as np, wave
SR=48000; DUR=22.6
rng=np.random.default_rng(7)
out=np.zeros(int(SR*DUR))
def add(t0, x, db):
    i=int(t0*SR); x=x*10**(db/20)
    n=min(len(x), len(out)-i)
    if n>0: out[i:i+n]+=x[:n]
def lp(x,a):  # one-pole low-pass
    y=np.zeros_like(x); s=0
    for k in range(len(x)):
        s+=a*(x[k]-s); y[k]=s
    return y
def noise(d): return rng.standard_normal(int(SR*d))
def whoosh(d, db, t0):
    n=noise(d); e=np.sin(np.linspace(0,np.pi,len(n)))**2
    x=lp(n,0.12)*e; x/=np.abs(x).max()+1e-9
    add(t0,x,db)
def thud(db,t0):
    d=0.35; t=np.arange(int(SR*d))/SR
    x=np.sin(2*np.pi*(90*np.exp(-t*9)+45)*t)*np.exp(-t*12)
    x+=0.5*lp(noise(d),0.3)*np.exp(-t*40)
    # metallic clank
    x+=0.35*np.sin(2*np.pi*520*t)*np.exp(-t*30)+0.25*np.sin(2*np.pi*830*t)*np.exp(-t*38)
    add(t0,x/np.abs(x).max(),db)
def hiss(d,db,t0):
    n=noise(d); e=np.sin(np.linspace(0,np.pi,len(n)))**1.5
    x=(n-lp(n,0.08))*e; add(t0,x/np.abs(x).max(),db)
def pop(db,t0):
    d=0.18; t=np.arange(int(SR*d))/SR
    x=np.sin(2*np.pi*(300+900*np.exp(-t*30))*t)*np.exp(-t*22)
    add(t0,x,db)
def wind(t0,t1,db):
    d=t1-t0; n=noise(d); y=lp(n,0.03); y2=lp(y,0.05)
    e=np.minimum(1,np.arange(len(n))/SR/1.2)*np.minimum(1,(len(n)-np.arange(len(n)))/SR/1.2)
    mod=0.6+0.4*np.sin(2*np.pi*0.5*np.arange(len(n))/SR)
    x=y2*e*mod; add(t0,x/np.abs(x).max(),db)
whoosh(1.5,-16,4.1); whoosh(1.9,-17,18.2)
pop(-14,5.3); pop(-12,6.7)
wind(8.2,14.2,-20)
for im in json.load(open('tools/impacts.json')):
    thud(-10,im['t']); hiss(1.4,-24,im['t']+0.12)
out*=0.75/np.abs(out).max()
pcm=(out*32767).astype(np.int16)
with wave.open('public/taipei/sfx.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak',np.abs(out).max())
