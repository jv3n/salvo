import * as THREE from 'three';

function makeCanvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function wallTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(64, (ctx) => {
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#3a2418';
    for (let y = 0; y < 64; y += 16) {
      const off = (y / 16) % 2 === 0 ? 0 : 16;
      for (let x = -16; x < 64; x += 32) {
        ctx.fillRect(x + off, y + 15, 32, 1);
        ctx.fillRect(x + off + 31, y, 2, 16);
      }
    }
    for (let i = 0; i < 220; i++) {
      const x = (Math.random() * 64) | 0;
      const y = (Math.random() * 64) | 0;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.28})`;
      ctx.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() * 64) | 0;
      const y = (Math.random() * 64) | 0;
      ctx.fillStyle = `rgba(255,200,120,${Math.random() * 0.07})`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

export function floorTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(64, (ctx) => {
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 64, 2);
    ctx.fillRect(0, 0, 2, 64);
    ctx.fillRect(0, 32, 64, 1);
    ctx.fillRect(32, 0, 1, 64);
    for (let i = 0; i < 400; i++) {
      const x = (Math.random() * 64) | 0;
      const y = (Math.random() * 64) | 0;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.22})`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

export function ceilingTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(64, (ctx) => {
    ctx.fillStyle = '#1a1815';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() * 64) | 0;
      const y = (Math.random() * 64) | 0;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

export function enemyTexture(state: 'idle' | 'hurt' | 'dead'): THREE.CanvasTexture {
  return makeCanvasTexture(64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    if (state === 'dead') {
      ctx.fillStyle = '#4a2a1a';
      ctx.fillRect(8, 50, 48, 10);
      ctx.fillStyle = '#7a3030';
      ctx.fillRect(14, 56, 36, 4);
      ctx.fillStyle = '#9a3030';
      ctx.fillRect(20, 58, 8, 3);
      ctx.fillRect(36, 58, 8, 3);
      return;
    }
    const skin = state === 'hurt' ? '#b04030' : '#6b3a2a';
    const skin2 = state === 'hurt' ? '#c85040' : '#7d4838';
    ctx.fillStyle = skin;
    ctx.fillRect(20, 28, 24, 28);
    ctx.fillRect(16, 32, 32, 22);
    ctx.fillStyle = skin2;
    ctx.fillRect(22, 14, 20, 18);
    ctx.fillStyle = '#ffee44';
    ctx.fillRect(25, 20, 4, 4);
    ctx.fillRect(35, 20, 4, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(26, 21, 2, 2);
    ctx.fillRect(36, 21, 2, 2);
    ctx.fillStyle = '#1a0a05';
    ctx.fillRect(26, 27, 12, 3);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(28, 27, 1, 3);
    ctx.fillRect(31, 27, 1, 3);
    ctx.fillRect(34, 27, 1, 3);
    ctx.fillRect(37, 27, 1, 3);
    ctx.fillStyle = skin;
    ctx.fillRect(10, 34, 6, 18);
    ctx.fillRect(48, 34, 6, 18);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(22, 56, 8, 6);
    ctx.fillRect(34, 56, 8, 6);
  });
}

export function shotgunTexture(firing: boolean): THREE.CanvasTexture {
  return makeCanvasTexture(128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(46, 80, 32, 42);
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(46, 80, 32, 3);
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(34, 70, 54, 12);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(34, 70, 54, 2);
    ctx.fillRect(34, 80, 54, 2);
    for (let x = 38; x < 86; x += 4) {
      ctx.fillRect(x, 73, 1, 6);
    }
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(40, 56, 50, 14);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(40, 56, 50, 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(54, 26, 18, 32);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(54, 26, 18, 2);
    ctx.fillRect(54, 35, 18, 1);
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(52, 28, 22, 3);
    if (firing) {
      const cx = 63,
        cy = 20;
      const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 38);
      grad.addColorStop(0, '#ffffdd');
      grad.addColorStop(0.3, '#ffcc44');
      grad.addColorStop(0.7, '#ff6600');
      grad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function weaponTexture(firing: boolean): THREE.CanvasTexture {
  return makeCanvasTexture(128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(52, 78, 24, 42);
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(52, 78, 24, 4);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(46, 58, 36, 24);
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(46, 58, 36, 3);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(58, 30, 12, 30);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(60, 30, 8, 4);
    if (firing) {
      const cx = 64,
        cy = 24;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
      grad.addColorStop(0, '#ffffcc');
      grad.addColorStop(0.4, '#ffaa22');
      grad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
