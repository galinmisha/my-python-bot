import json, numpy as np, wave
SR=48000; DUR=24.6
rng=np.random.default_rng(21)
out=np.zeros(int(SR*DUR))
def add(t0,x,db):
    i=int(t0*SR); x=x*10**(db/20); n=min(len(x),len(out)-i)
    if n>0: out[i:i+n]+=x[:n]
def lp(x,a):
    y=np.zeros_like(x); s=0.0
    for k in range(len(x)):
        s+=a*(x[k]-s); y[k]=s
    return y
def noise(d): return rng.standard_normal(int(SR*d))
def pop(f0,f1,d=0.16,db=-12,t0=0):
    t=np.arange(int(SR*d))/SR
    x=np.sin(2*np.pi*(f1+(f0-f1)*np.exp(-t*30))*t)*np.exp(-t*20); add(t0,x,db)
def thud(t0,db=-9):
    d=0.3; t=np.arange(int(SR*d))/SR
    x=np.sin(2*np.pi*(80*np.exp(-t*9)+45)*t)*np.exp(-t*13)+0.3*lp(noise(d),0.25)*np.exp(-t*45)
    add(t0,x/np.abs(x).max(),db)
def whoosh(t0,d=1.0,db=-18):
    n=noise(d); e=np.sin(np.linspace(0,np.pi,len(n)))**2
    x=lp(n,0.1)*e; add(t0,x/np.abs(x).max(),db)
def creak(t0,d,db=-24):
    n=noise(d); y=lp(n,0.02); mod=0.5+0.5*np.sin(2*np.pi*3.5*np.arange(len(n))/SR)
    e=np.minimum(1,np.arange(len(n))/SR/0.3)*np.minimum(1,(len(n)-np.arange(len(n)))/SR/0.3)
    x=y*mod*e; add(t0,x/np.abs(x).max(),db)
def ding(t0,db=-16):
    d=0.5; t=np.arange(int(SR*d))/SR
    x=(np.sin(2*np.pi*1320*t)+0.5*np.sin(2*np.pi*1980*t))*np.exp(-t*7); add(t0,x/np.abs(x).max(),db)
def rumble(t0,d,db=-22):
    n=noise(d); y=lp(lp(n,0.05),0.08); e=np.minimum(1,np.arange(len(n))/SR/0.2); add(t0,y*e/np.abs(y).max(),db)

def shimmer(t0,d=1.2,db=-22):
    t=np.arange(int(SR*d))/SR
    x=sum(np.sin(2*np.pi*f*t)*np.exp(-t*3) for f in (880,1320,1760,2640))
    add(t0,x/np.abs(x).max(),db)
pop(900,300,0.18,-12,2.55); shimmer(2.55,1.0,-24)
pop(800,300,0.16,-12,3.45); whoosh(3.4,0.7,-24)
whoosh(4.3,0.8,-26)
for i,tt in enumerate((6.3,6.55,6.8,7.05)): ding(tt+0.0,-24)
whoosh(8.15,0.6,-22); pop(600,220,0.16,-13,8.55)
whoosh(10.3,1.2,-28)
pop(900,300,0.12,-16,13.8); ding(14.6,-16)
pop(600,200,0.18,-13,16.7); whoosh(16.7,0.5,-24)
shimmer(18.35,1.4,-20); thud(18.4,-14)
whoosh(19.7,1.8,-22)
pop(800,300,0.18,-12,22.0); shimmer(22.0,1.0,-24)
whoosh(23.0,1.5,-24)
out*=0.75/np.abs(out).max()
with wave.open('public/mars/sfx.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype(np.int16).tobytes())
print('ok')
