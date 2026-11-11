import json, numpy as np, wave
SR=48000; DUR=23.2
rng=np.random.default_rng(11)
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
pop(900,300,0.18,-12,2.55); pop(900,300,0.12,-18,3.2)
for t0 in (3.55,3.95,4.35): pop(700,250,0.12,-14,t0)
whoosh(5.45,1.0,-18)
pop(800,350,0.15,-15,8.7); pop(800,350,0.15,-15,9.7)
whoosh(10.99,1.1,-24)
pop(600,200,0.2,-13,12.4)
creak(12.7,2.6,-24)
ding(15.45,-17)
pop(600,200,0.2,-13,17.94); whoosh(17.94,0.6,-22); thud(18.59,-9)
pop(900,300,0.15,-14,20.6); rumble(21.28,0.75,-26)
for tc in json.load(open('tools/wombat_events.json')): thud(tc,-14)
out*=0.75/np.abs(out).max()
with wave.open('public/wombat/sfx.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype(np.int16).tobytes())
print('ok')
