// Mach Ops sprite library — top-down airframes, nose up, 1000 units long, viewBox -400 0 800 1000.
// <mo-sprite type="f16" length="120" variant="livery|silhouette" flame heading="0">
(function () {
  const L = '#2A2F36', CANOPY = '#1B2A3A', GLINT = '#7DD3FC';
  const mir = (pts) => pts.split(' ').map(p => { const [x, y] = p.split(','); return (-x) + ',' + y; }).join(' ');
  const poly = (pts, fill, id) => `<polygon id="${id||''}" points="${pts}" fill="${fill}"></polygon>`;
  const pair = (pts, fill, id) => poly(pts, fill, id + '-r') + poly(mir(pts), fill, id + '-l');
  const canopy = (y0, y1, w) => {
    const m = y0 + (y1 - y0) * 0.5;
    return `<g id="canopy"><path d="M0 ${y0} C${w} ${y0 + 20} ${w} ${m - 20} ${w} ${m} C${w} ${y1 - 30} ${w * 0.6} ${y1 - 8} 0 ${y1} C${-w * 0.6} ${y1 - 8} ${-w} ${y1 - 30} ${-w} ${m} C${-w} ${m - 20} ${-w} ${y0 + 20} 0 ${y0} Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M${-w * 0.45} ${y0 + 30} C${-w * 0.7} ${y0 + 70} ${-w * 0.7} ${m + 10} ${-w * 0.55} ${m + 40}" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>`;
  };
  const flame = (xs, w, y = 1000) => `<g id="flame">${xs.map(x => `<polygon points="${x - w},${y} ${x + w},${y} ${x},${y + w * 4}" fill="#F5B841" opacity="0.85"></polygon><polygon points="${x - w / 2},${y} ${x + w / 2},${y} ${x},${y + w * 2.3}" fill="#FFF3C4"></polygon>`).join('')}</g>`;
  const nozzles = (xs, rx, y = 1000) => xs.map(x => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.28}" fill="${L}"></ellipse>`).join('');

  const A = {
    t38: { name: 'T-38 Talon', base: '#E9ECEF', panel: '#D8DDE2', radome: '#9AA1A8', flameX: [-18, 18], flameW: 12,
      body: 'M0 0 L12 50 22 100 30 200 34 300 36 450 44 520 46 700 42 900 36 1000 L-36 1000 -42 900 -46 700 -44 520 -36 450 -34 300 -30 200 -22 100 -12 50 Z',
      radomePath: 'M0 0 L12 50 22 100 L-22 100 -12 50 Z',
      parts: (c) => pair('40,560 272,660 272,700 40,760', c.base, 'wing') + pair('30,880 150,950 150,975 30,990', c.base, 'stab') + poly('0,760 6,800 6,980 12,1000 -12,1000 -6,980 -6,800', c.panel, 'fin'),
      ctrl: (c) => pair('60,730 240,700 240,712 60,760', c.panel, 'flaperon'),
      canopy: [170, 400, 22], frames: [290], noz: [[-18, 18], 14],
      marks: (c) => `<polygon points="-272,660 -272,700 -230,690 -230,672" fill="#1F4FA3"></polygon><polygon points="272,660 272,700 230,690 230,672" fill="#1F4FA3"></polygon><rect x="-6" y="860" width="12" height="120" fill="#1F4FA3"></rect><rect x="-46" y="520" width="92" height="10" fill="#1F4FA3"></rect>` },
    f16: { name: 'F-16C Fighting Falcon', base: '#5F656D', panel: '#6C7279', radome: '#23272C', flameX: [0], flameW: 30,
      body: 'M0 0 L18 60 32 120 44 200 50 300 58 400 68 480 72 600 72 760 62 860 48 950 40 1000 L-40 1000 -48 950 -62 860 -72 760 -72 600 -68 480 -58 400 -50 300 -44 200 -32 120 -18 60 Z',
      radomePath: 'M0 0 L18 60 32 120 L-32 120 -18 60 Z',
      parts: (c) => pair('60,800 185,905 185,955 60,985', c.base, 'stab') + pair('100,472 330,668 330,745 72,780', c.base, 'wing') + pair('46,250 100,472 72,480 58,400 50,300', c.base, 'strake') + poly('0,700 4,760 5,920 14,1000 -14,1000 -5,920 -4,760', c.panel, 'fin'),
      ctrl: (c) => pair('95,721 305,690 305,745 95,776', c.panel, 'flaperon') + poly('-5,880 5,880 5,960 -5,960', '#7A8087', 'rudder'),
      canopy: [140, 340, 30], frames: [300], noz: [[0], 34],
      marks: (c) => `<circle cx="-200" cy="690" r="26" fill="#3F444B"></circle><path transform="translate(-200 690)" d="M0,-22 L5.3,-7.3 L20.9,-6.8 L8.6,2.8 L12.9,17.8 L0,9 L-12.9,17.8 L-8.6,2.8 L-20.9,-6.8 L-5.3,-7.3 Z" fill="#8B9098"></path><path d="M-50 300 L50 300 M-68 480 L68 480 M-72 800 L72 800" stroke="${L}" stroke-width="1.5" opacity="0.7"></path>` },
    f15: { name: 'F-15C Eagle', base: '#7F868E', panel: '#98A0A8', radome: '#5A6068', flameX: [-55, 55], flameW: 24,
      body: 'M0 0 L20 60 34 120 48 220 60 320 110 340 110 560 100 700 100 980 60 1000 L-60 1000 -100 980 -100 700 -110 560 -110 340 -60 320 -48 220 -34 120 -20 60 Z',
      radomePath: 'M0 0 L20 60 34 120 L-34 120 -20 60 Z',
      parts: (c) => pair('110,420 336,646 336,730 100,790', c.base, 'wing') + pair('100,820 215,900 215,950 100,990', c.base, 'stab') + pair('64,700 78,700 80,960 62,960', c.panel, 'fin'),
      ctrl: (c) => pair('120,740 300,700 300,730 120,790', c.panel, 'aileron') + pair('66,880 78,880 79,960 65,960', '#A8AFB6', 'rudder'),
      canopy: [160, 360, 26], frames: [280], noz: [[-55, 55], 26],
      marks: (c) => `<rect x="62" y="340" width="48" height="12" fill="${L}"></rect><rect x="-110" y="340" width="48" height="12" fill="${L}"></rect><path d="M-100 560 L100 560 M-100 800 L100 800" stroke="${L}" stroke-width="1.5" opacity="0.7"></path>` },
    f18: { name: 'F/A-18E Super Hornet', base: '#7C838B', panel: '#8C939B', radome: '#5A6068', flameX: [-45, 45], flameW: 22,
      body: 'M0 0 L18 60 30 120 42 220 50 320 52 420 90 430 90 560 85 700 85 960 45 1000 L-45 1000 -85 960 -85 700 -90 560 -90 430 -52 420 -50 320 -42 220 -30 120 -18 60 Z',
      radomePath: 'M0 0 L18 60 30 120 L-30 120 -18 60 Z',
      parts: (c) => pair('46,220 120,520 90,530 52,380', c.base, 'lerx') + pair('120,520 372,650 372,740 85,790', c.base, 'wing') + pair('85,800 220,880 220,940 85,990', c.base, 'stab') + pair('55,640 72,640 102,880 86,890', c.panel, 'fin'),
      ctrl: (c) => pair('120,745 250,720 250,765 120,790', c.panel, 'flap') + pair('255,720 360,700 360,740 255,765', c.panel, 'aileron') + pair('80,820 90,820 100,880 86,890', '#9CA3AB', 'rudder'),
      canopy: [150, 340, 24], frames: [270], noz: [[-45, 45], 22],
      marks: (c) => `<path d="M250 590 L250 765 M-250 590 L-250 765" stroke="${L}" stroke-width="2"></path><rect x="55" y="420" width="35" height="12" fill="${L}"></rect><rect x="-90" y="420" width="35" height="12" fill="${L}"></rect><text x="-170" y="700" font-family="IBM Plex Mono" font-size="28" font-weight="600" fill="#5A6068" text-anchor="middle">NAVY</text>` },
    f22: { name: 'F-22A Raptor', base: '#6F757C', panel: '#7E858C', radome: '#5A6068', flameX: [-50, 50], flameW: 22,
      body: 'M0 0 L22 70 38 140 56 240 120 320 120 760 100 880 78 1000 L-78 1000 -100 880 -120 760 -120 320 -56 240 -38 140 -22 70 Z',
      radomePath: 'M0 0 L22 70 38 140 L-38 140 -22 70 Z',
      parts: (c) => pair('120,400 358,640 358,700 115,780', c.base, 'wing') + pair('115,790 230,860 230,900 140,960 115,965', c.base, 'stab') + pair('70,640 92,640 152,900 130,910', c.panel, 'fin'),
      ctrl: (c) => pair('130,740 330,690 330,715 130,780', c.panel, 'flaperon') + pair('110,860 134,860 152,900 130,910', '#8E959C', 'rudder'),
      canopy: [170, 400, 28], frames: [], noz: [[], 0],
      marks: (c) => `<rect x="26" y="994" width="50" height="14" fill="${L}"></rect><rect x="-76" y="994" width="50" height="14" fill="${L}"></rect><path d="M-56 240 L-40 260 -56 280 -40 300 M56 240 L40 260 56 280 40 300 M-120 320 L-100 330 -120 340 M120 320 L100 330 120 340" stroke="${L}" stroke-width="2" fill="none" opacity="0.8"></path>` },
    f35: { name: 'F-35A Lightning II', base: '#4F555C', panel: '#5C626A', radome: '#3A3F45', flameX: [0], flameW: 32,
      body: 'M0 0 L24 70 40 140 60 240 78 320 100 380 100 720 82 880 46 1000 L-46 1000 -82 880 -100 720 -100 380 -78 320 -60 240 -40 140 -24 70 Z',
      radomePath: 'M0 0 L24 70 40 140 L-40 140 -24 70 Z',
      parts: (c) => pair('100,470 341,630 341,720 95,790', c.base, 'wing') + pair('90,800 200,880 200,930 90,985', c.base, 'stab') + pair('60,650 80,650 122,880 102,890', c.panel, 'fin'),
      ctrl: (c) => pair('110,745 320,705 320,730 110,790', c.panel, 'flaperon') + pair('96,840 116,840 122,880 102,890', '#6C7279', 'rudder'),
      canopy: [150, 380, 27], frames: [], noz: [[0], 36],
      marks: (c) => `<ellipse cx="88" cy="350" rx="14" ry="30" fill="${c.panel}"></ellipse><ellipse cx="-88" cy="350" rx="14" ry="30" fill="${c.panel}"></ellipse><path d="M-100 480 L100 480 M-82 880 L82 880" stroke="${L}" stroke-width="1.5" opacity="0.7"></path>` },
    sr71: { name: 'SR-71 Blackbird', base: '#1C1F24', panel: '#26292F', radome: '#26292F', flameX: [-135, 135], flameW: 26,
      body: 'M0 0 L10 80 26 200 44 330 56 450 58 560 40 1000 L-40 1000 -58 560 -56 450 -44 330 -26 200 -10 80 Z',
      radomePath: 'M0 0 L10 80 26 200 L-26 200 -10 80 Z',
      parts: (c) => pair('58,560 259,900 259,960 40,1000', c.base, 'wing') + pair('135,430 177,520 177,1000 93,1000 93,520', c.panel, 'nacelle') + pair('120,820 132,820 142,985 130,985', c.base, 'fin'),
      ctrl: (c) => pair('180,940 250,940 255,960 180,1000', c.panel, 'elevon-out') + pair('50,960 92,960 92,1000 40,1000', c.panel, 'elevon-in'),
      canopy: [260, 360, 17], frames: [], noz: [[-135, 135], 30],
      marks: (c) => `<ellipse cx="135" cy="520" rx="30" ry="10" fill="#0A0C0F"></ellipse><ellipse cx="-135" cy="520" rx="30" ry="10" fill="#0A0C0F"></ellipse><text x="-215" y="945" font-family="IBM Plex Mono" font-size="26" font-weight="600" fill="#C8312B" text-anchor="middle">17972</text><path d="M-58 560 L58 560" stroke="#3A3F45" stroke-width="1.5"></path>` },
    f4: { name: 'F-4E Phantom II', base: '#7F868E', panel: '#8E959D', radome: '#2A2F36', flameX: [-40, 40], flameW: 22,
      body: 'M0 0 L14 60 26 130 36 220 42 320 92 350 98 600 98 900 84 1000 L-84 1000 -98 900 -98 600 -92 350 -42 320 -36 220 -26 130 -14 60 Z',
      radomePath: 'M0 0 L14 60 26 130 L-26 130 -14 60 Z',
      parts: (c) => pair('98,440 220,640 305,700 305,745 98,800', c.base, 'wing') + pair('84,860 205,950 205,985 84,995', c.base, 'stab') + poly('0,600 6,650 8,940 16,1000 -16,1000 -8,940 -6,650', c.panel, 'fin'),
      ctrl: (c) => pair('110,752 280,720 280,748 110,800', c.panel, 'aileron') + poly('-6,880 6,880 8,940 -8,940', '#9CA3AB', 'rudder'),
      canopy: [150, 420, 26], frames: [280, 300], noz: [[-40, 40], 24],
      marks: (c) => `<rect x="42" y="320" width="50" height="14" fill="${L}"></rect><rect x="-92" y="320" width="50" height="14" fill="${L}"></rect><path d="M220 640 L232 660" stroke="${L}" stroke-width="3"></path><path d="M-220 640 L-232 660" stroke="${L}" stroke-width="3"></path><text x="-200" y="740" font-family="IBM Plex Mono" font-size="26" font-weight="600" fill="#5A6068" text-anchor="middle">AF</text><path d="M-98 600 L98 600 M-98 860 L98 860" stroke="${L}" stroke-width="1.5" opacity="0.7"></path>` },
    a10: { name: 'A-10C Thunderbolt II', base: '#4A5058', panel: '#575D66', radome: '#2A2F36', flameX: [-105, 105], flameW: 20, nozY: 940, halfW: 560,
      body: 'M0 0 L20 50 30 110 40 200 46 320 50 500 52 700 50 900 40 1000 L-40 1000 -50 900 -52 700 -50 500 -46 320 -40 200 -30 110 -20 50 Z',
      radomePath: 'M0 0 L20 50 30 110 L-30 110 -20 50 Z',
      parts: (c) => pair('50,420 540,450 540,570 50,630', c.base, 'wing') + pair('72,640 138,640 138,940 72,940', c.panel, 'nacelle') + pair('40,890 262,890 262,955 40,990', c.base, 'stab') + pair('228,860 250,860 250,1000 228,1000', c.panel, 'fin'),
      ctrl: (c) => pair('160,560 520,540 520,570 160,630', c.panel, 'aileron') + pair('60,955 240,955 240,975 60,990', c.panel, 'elevator'),
      canopy: [120, 300, 28], frames: [], noz: [[-105, 105], 30],
      marks: (c) => `<circle cx="-8" cy="14" r="7" fill="#0A0C0F"></circle><text x="-300" y="530" font-family="IBM Plex Mono" font-size="30" font-weight="600" fill="#6C7279" text-anchor="middle">AF</text><path d="M-46 320 L46 320 M-540 510 L540 510" stroke="${L}" stroke-width="1.5" opacity="0.7"></path>` },
    f14: { name: 'F-14 Tomcat', base: '#8A9199', panel: '#9AA1A9', radome: '#5A6068', flameX: [-95, 95], flameW: 24,
      body: 'M0 0 L16 60 28 130 40 240 46 340 130 400 130 600 130 900 108 1000 L-108 1000 -130 900 -130 600 -130 400 -46 340 -40 240 -28 130 -16 60 Z',
      radomePath: 'M0 0 L16 60 28 130 L-28 130 -16 60 Z',
      parts: (c) => pair('46,340 230,480 130,520 130,400', c.base, 'glove') + pair('200,470 400,690 400,745 130,730', c.base, 'wing') + pair('110,830 262,920 262,970 110,990', c.base, 'stab') + pair('60,660 84,660 90,960 60,970', c.panel, 'fin'),
      ctrl: (c) => pair('180,720 380,690 380,720 180,740', c.panel, 'flap') + pair('62,880 86,880 90,960 60,970', '#A8AFB6', 'rudder'),
      canopy: [150, 400, 27], frames: [280], noz: [[-95, 95], 30],
      marks: (c) => `<rect x="46" y="380" width="80" height="14" fill="${L}"></rect><rect x="-126" y="380" width="80" height="14" fill="${L}"></rect><path d="M-130 600 L130 600" stroke="${L}" stroke-width="1.5" opacity="0.7"></path><text x="-200" y="660" font-family="IBM Plex Mono" font-size="24" font-weight="600" fill="#5A6068" text-anchor="middle">NAVY</text>` },
    f117: { name: 'F-117 Nighthawk', base: '#15171B', panel: '#1F2227', radome: '#15171B', flameX: [0], flameW: 40, flame2: true,
      body: 'M0 0 L330 720 330 745 175 700 110 790 60 1000 L-60 1000 -110 790 -175 700 -330 745 -330 720 Z',
      radomePath: 'M0 0 L18 40 L-18 40 Z',
      parts: (c) => pair('44,790 70,790 132,985 104,995', c.panel, 'fin'),
      ctrl: (c) => pair('140,700 315,738 315,745 175,700', c.panel, 'elevon') + pair('90,920 122,920 132,985 104,995', '#2A2E34', 'rudder'),
      canopy: [180, 360, 40], canopyPath: 'M0 170 L44 250 L44 340 L0 380 L-44 340 L-44 250 Z', frames: [], noz: [[], 0],
      marks: (c) => `<rect x="-46" y="988" width="92" height="12" fill="#0A0C0F"></rect><path d="M0 0 L0 380 M0 380 L110 790 M0 380 L-110 790 M44 250 L330 720 M-44 250 L-330 720 M44 340 L175 700 M-44 340 L-175 700" stroke="#2A2E34" stroke-width="2" fill="none"></path><text x="-210" y="640" font-family="Chakra Petch" font-size="30" font-weight="700" fill="#3A3F45" text-anchor="middle">HO</text>` },
    // fictional bogeys — red-brown, drawn 720 units long so they read smaller
    bogey1: { name: 'Bogey · Dart', base: '#8C3B2E', panel: '#6E2E24', radome: '#3A1A14', flameX: [0], flameW: 20, bogey: true,
      body: 'M0 0 L30 400 40 700 -40 700 -30 400 Z', radomePath: 'M0 0 L14 180 L-14 180 Z',
      parts: (c) => pair('34,420 180,640 180,690 40,700', c.base, 'wing') + poly('0,520 5,540 5,700 -5,700 -5,540', c.panel, 'fin'), ctrl: () => '', canopy: [200, 300, 12], frames: [], noz: [[0], 22], marks: () => '' },
    bogey2: { name: 'Bogey · Vulture', base: '#8C3B2E', panel: '#6E2E24', radome: '#3A1A14', flameX: [-22, 22], flameW: 14, bogey: true,
      body: 'M0 0 L20 200 36 500 36 700 -36 700 -36 500 -20 200 Z', radomePath: 'M0 0 L10 140 L-10 140 Z',
      parts: (c) => pair('36,600 200,420 210,470 36,700', c.base, 'wing') + pair('20,560 30,560 60,700 46,700', c.panel, 'fin'), ctrl: () => '', canopy: [160, 260, 12], frames: [], noz: [[-22, 22], 14], marks: () => '' },
    bogey3: { name: 'Bogey · Wedge', base: '#8C3B2E', panel: '#6E2E24', radome: '#3A1A14', flameX: [-60, 60], flameW: 16, bogey: true,
      body: 'M0 0 L200 520 180 580 0 500 -180 580 -200 520 Z', radomePath: 'M0 0 L40 120 L-40 120 Z',
      parts: (c) => '', ctrl: (c) => pair('60,470 170,540 160,570 60,520', c.panel, 'elevon'), canopy: [150, 240, 12], frames: [], noz: [[-60, 60], 16], marks: () => '' },
  };

  // side profiles — nose left, 1000 long, viewBox 0 0 1000 300
  const SIDE = {
    t38: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M700 182 L840 40 Q850 30 862 30 L900 30 Q912 30 914 42 L985 190 Z" fill="${c.base}"></path>
      <path id="stab" d="M840 232 L860 222 Q920 220 990 226 L998 240 L860 244 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 200 Q60 180 120 172 L520 176 Q700 178 780 182 L985 190 L1000 205 L1000 225 L0 225 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 200 L0 225 L1000 225 L1000 240 Q900 258 800 262 L300 268 Q150 264 60 240 Z" fill="${c.panel}"></path>
      <path id="outline" d="M0 200 Q60 180 120 172 L520 176 Q700 178 780 182 L985 190 L1000 205 L1000 240 Q900 258 800 262 L300 268 Q150 264 60 240 Z" fill="none"></path>
      <path id="wing" d="M420 240 Q550 236 720 240 L720 250 Q550 254 440 250 Z" fill="${c.panel}"></path>
      <rect id="intake" x="470" y="204" width="40" height="30" rx="4" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <rect id="nozzle" x="984" y="205" width="16" height="38" fill="${sil ? c.base : L}"></rect>
      <path id="radome" d="M0 200 Q40 186 80 178 L80 232 L40 230 Z" fill="${c.radome}"></path></g>` + (sil ? '' : `
      <g id="canopy"><path d="M110 172 C140 130 220 118 300 122 C360 124 400 150 420 160 L470 172 L130 176 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M200 128 L204 174 M312 122 L314 174" stroke="${L}" stroke-width="3"></path><path d="M150 150 C190 132 240 128 290 128" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><path d="M60 233 L984 233" stroke="#1F4FA3" stroke-width="8"></path><path d="M760 120 L900 120 L910 150 L790 150 Z" fill="#1F4FA3"></path><text x="820" y="178" font-family="IBM Plex Mono" font-size="18" font-weight="600" fill="#1F4FA3">AF 68-8210</text><text x="440" y="215" font-family="Chakra Petch" font-size="22" font-weight="700" fill="#1F4FA3">U.S. AIR FORCE</text></g>`),
    f16: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M640 186 L845 52 Q855 44 868 44 L950 44 Q962 44 964 56 L982 186 Z" fill="${c.base}"></path>
      <path id="stab" d="M790 228 L812 216 Q900 214 990 222 L998 236 L990 240 L800 236 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 216 Q60 198 130 184 L400 176 Q560 178 660 184 L985 190 L1000 212 L1000 232 L0 232 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 216 L0 232 L1000 232 L1000 240 Q950 262 900 268 L700 300 L260 306 Q205 306 190 290 L188 262 Q165 254 150 250 L60 236 Z" fill="${sil ? c.base : '#8B9098'}"></path>
      <path id="intake" d="M150 250 Q170 250 188 262 L190 290 Q205 306 260 306 L300 306 L300 292 Q260 292 236 282 Q220 270 214 258 L188 250 Z" fill="${c.panel}"></path>
      <rect id="intake-face" x="186" y="258" width="14" height="46" rx="3" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <path id="outline" d="M0 216 Q60 198 130 184 L400 176 Q560 178 660 184 L985 190 L1000 212 L1000 240 Q950 262 900 268 L700 300 L260 306 Q205 306 190 290 L188 262 Q165 254 150 250 L60 236 Z" fill="none"></path>
      <path id="wing" d="M470 248 Q600 238 780 244 L780 256 Q600 260 500 254 Z" fill="${c.panel}"></path>
      <polygon id="ventral-fin" points="720,300 830,300 830,330 760,332" fill="${c.panel}"></polygon>
      <path id="radome" d="M0 216 Q60 198 110 186 L110 246 L60 236 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="984" y="205" width="16" height="40" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M125 178 C160 140 260 125 320 140 C360 150 390 165 400 172 L140 176 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M300 136 L302 173" stroke="${L}" stroke-width="3"></path><path d="M170 160 C210 142 260 138 300 140" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="880" y="120" font-family="Chakra Petch" font-size="40" font-weight="700" fill="${L}">SW</text><text x="866" y="150" font-family="IBM Plex Mono" font-size="16" font-weight="600" fill="${L}">AF 88-482</text></g>`),
    f15: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M700 180 L830 30 Q838 20 850 20 L900 20 Q912 20 916 32 L975 180 Z" fill="${c.base}"></path>
      <path id="stab" d="M800 232 L830 220 Q900 216 995 224 L1000 240 L820 244 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 214 Q80 196 160 184 L440 178 Q600 180 700 184 L980 190 L1000 208 L1000 236 L0 236 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 214 L0 236 L1000 236 L1000 250 L900 262 L340 272 Q300 272 290 262 L290 240 Q200 246 120 236 Z" fill="${c.panel}"></path>
      <path id="intake" d="M290 240 L300 200 L400 200 L400 262 Q340 272 290 262 Z" fill="${c.base}"></path>
      <rect id="intake-face" x="290" y="200" width="14" height="60" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <path id="outline" d="M0 214 Q80 196 160 184 L440 178 Q600 180 700 184 L980 190 L1000 208 L1000 250 L900 262 L340 272 Q300 272 290 262 L290 240 Q200 246 120 236 Z" fill="none"></path>
      <path id="wing" d="M440 250 Q600 240 790 246 L790 258 Q600 262 470 256 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 214 Q60 200 110 190 L110 240 L60 232 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="982" y="204" width="18" height="46" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M150 184 C190 140 280 128 340 140 C380 148 420 168 440 178 L165 182 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M330 136 L332 180" stroke="${L}" stroke-width="3"></path><path d="M200 160 C240 142 290 138 330 140" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="845" y="110" font-family="Chakra Petch" font-size="40" font-weight="700" fill="${L}">FF</text><text x="838" y="140" font-family="IBM Plex Mono" font-size="16" font-weight="600" fill="${L}">AF 85-102</text></g>`),
    f18: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M640 184 L760 40 Q768 30 780 30 L850 30 Q862 30 864 42 L880 184 Z" fill="${c.base}"></path>
      <path id="stab" d="M800 232 L830 220 Q900 216 990 224 L998 240 L820 244 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 216 Q70 198 140 186 L400 178 Q600 182 700 186 L985 192 L1000 210 L1000 236 L0 236 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 216 L0 236 L1000 236 L1000 250 L920 262 L380 270 Q330 270 320 258 L320 236 Q200 246 120 238 Z" fill="${c.panel}"></path>
      <rect id="intake-face" x="320" y="210" width="14" height="52" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <path id="outline" d="M0 216 Q70 198 140 186 L400 178 Q600 182 700 186 L985 192 L1000 210 L1000 250 L920 262 L380 270 Q330 270 320 258 L320 236 Q200 246 120 238 Z" fill="none"></path>
      <path id="lerx" d="M160 214 Q300 208 470 214 L470 224 Q300 222 160 224 Z" fill="${c.panel}"></path>
      <path id="wing" d="M470 248 Q620 240 790 246 L790 258 Q620 262 500 256 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 216 Q60 202 110 192 L110 242 L60 236 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="984" y="206" width="16" height="44" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M130 186 C170 140 260 128 320 140 C360 150 390 170 400 178 L145 184 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M300 134 L302 180" stroke="${L}" stroke-width="3"></path><path d="M180 160 C220 142 270 138 300 140" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="770" y="110" font-family="Chakra Petch" font-size="40" font-weight="700" fill="${L}">NE</text><text x="440" y="212" font-family="IBM Plex Mono" font-size="18" font-weight="600" fill="${L}">NAVY</text></g>`),
    f22: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M640 186 L760 60 Q768 50 780 50 L850 50 Q862 50 866 62 L900 186 Z" fill="${c.base}"></path>
      <path id="stab" d="M820 236 L850 224 Q920 220 985 226 L995 244 L840 248 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 220 Q80 200 160 188 L420 182 Q600 186 720 190 L980 196 L1000 214 L1000 240 L0 240 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 220 L0 240 L1000 240 L1000 250 L920 258 L380 272 Q330 272 320 262 L320 242 Q200 250 120 242 Z" fill="${c.panel}"></path>
      <path id="intake" d="M320 242 L330 210 L430 214 L430 268 Q380 272 320 262 Z" fill="${c.base}"></path>
      <rect id="intake-face" x="320" y="212" width="14" height="50" transform="skewY(-8)" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <path id="outline" d="M0 220 Q80 200 160 188 L420 182 Q600 186 720 190 L980 196 L1000 214 L1000 250 L920 258 L380 272 Q330 272 320 262 L320 242 Q200 250 120 242 Z" fill="none"></path>
      <path id="wing" d="M430 254 Q620 244 800 250 L800 262 Q620 266 470 260 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 220 Q60 206 110 196 L110 246 L60 240 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="982" y="212" width="18" height="38" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M150 188 C190 142 280 130 340 142 C380 152 410 172 420 182 L165 186 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M210 160 C250 142 300 138 340 142" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><path d="M440 200 L456 208 L440 216 L456 224 M700 196 L716 204 L700 212" stroke="${L}" stroke-width="2" fill="none" opacity="0.8"></path><text x="775" y="130" font-family="Chakra Petch" font-size="36" font-weight="700" fill="${L}">FF</text></g>`),
    f35: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M660 184 L790 60 Q798 50 810 50 L870 50 Q882 50 886 62 L920 184 Z" fill="${c.base}"></path>
      <path id="stab" d="M820 236 L850 224 Q920 220 990 228 L998 246 L840 250 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 222 Q80 198 160 184 L420 176 Q600 182 720 188 L985 194 L1000 212 L1000 240 L0 240 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 222 L0 240 L1000 240 L1000 254 L920 266 L400 282 Q340 282 320 268 L310 244 Q200 252 120 244 Z" fill="${c.panel}"></path>
      <path id="intake" d="M310 244 Q330 216 360 214 L440 216 L440 276 Q380 282 320 268 Z" fill="${c.base}"></path>
      <ellipse id="dsi-bump" cx="372" cy="246" rx="26" ry="18" fill="${c.panel}"></ellipse>
      <path id="outline" d="M0 222 Q80 198 160 184 L420 176 Q600 182 720 188 L985 194 L1000 212 L1000 254 L920 266 L400 282 Q340 282 320 268 L310 244 Q200 252 120 244 Z" fill="none"></path>
      <path id="wing" d="M460 256 Q620 246 790 252 L790 264 Q620 268 500 262 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 222 Q60 206 110 194 L110 248 L60 242 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="982" y="210" width="18" height="44" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M140 186 C180 130 290 116 360 132 C400 142 415 168 420 176 L155 184 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M200 156 C240 136 300 130 350 134" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="800" y="130" font-family="Chakra Petch" font-size="36" font-weight="700" fill="${L}">HL</text><text x="790" y="158" font-family="IBM Plex Mono" font-size="16" font-weight="600" fill="${L}">AF 15-5124</text></g>`),
    sr71: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M820 200 L890 110 Q896 102 906 102 L940 102 Q950 102 952 112 L975 200 Z" fill="${c.base}"></path>
      <path id="nacelle" d="M420 210 L470 196 L1000 196 L1000 262 L470 262 Z" fill="${c.panel}"></path>
      <path id="spike" d="M400 226 L470 210 L470 244 Z" fill="${sil ? c.base : '#0A0C0F'}"></path>
      <path id="fuselage-upper" d="M0 226 Q120 214 240 210 L520 206 Q800 208 990 212 L1000 224 L1000 236 L0 236 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 226 L0 236 L1000 236 L1000 246 Q800 252 520 254 L240 252 Q100 246 0 236 Z" fill="${c.panel}"></path>
      <path id="outline" d="M0 226 Q120 214 240 210 L520 206 Q800 208 990 212 L1000 224 L1000 246 Q800 252 520 254 L240 252 Q100 246 0 236 Z" fill="none"></path>
      <path id="chine" d="M60 230 Q300 224 520 226" stroke="${sil ? '#223347' : '#3A3F45'}" stroke-width="2" fill="none"></path>
      <rect id="nozzle" x="984" y="200" width="16" height="58" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M250 210 C270 192 320 186 360 190 C390 194 405 204 410 208 L262 210 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M285 200 C310 192 340 190 365 192" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="896" y="180" font-family="IBM Plex Mono" font-size="22" font-weight="600" fill="#C8312B">17972</text><text x="560" y="236" font-family="Chakra Petch" font-size="18" font-weight="700" fill="#8B9098">U.S. AIR FORCE</text></g>`),
    f4: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M660 186 L820 40 Q828 30 840 30 L900 30 Q912 30 916 42 L980 190 Z" fill="${c.base}"></path>
      <path id="stab" d="M830 246 L860 240 Q930 244 998 262 L995 274 L850 262 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 222 Q70 200 140 186 L420 178 Q600 182 720 186 L985 192 L1000 210 L1000 238 L0 238 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 222 L0 238 L1000 238 L1000 252 L900 262 L380 274 Q320 274 300 262 L300 236 Q200 246 120 240 Z" fill="${c.panel}"></path>
      <path id="intake" d="M300 236 L310 206 L420 206 L420 268 Q360 274 300 262 Z" fill="${c.base}"></path>
      <rect id="intake-face" x="300" y="206" width="14" height="56" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <path id="outline" d="M0 222 Q70 200 140 186 L420 178 Q600 182 720 186 L985 192 L1000 210 L1000 252 L900 262 L380 274 Q320 274 300 262 L300 236 Q200 246 120 240 Z" fill="none"></path>
      <path id="wing" d="M440 252 Q600 244 800 250 L800 262 Q600 266 470 260 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 222 Q60 204 130 190 L130 246 L60 240 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="982" y="206" width="18" height="46" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M150 186 C190 140 260 128 300 134 C330 140 350 150 360 158 C380 150 400 150 420 178 L165 184 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M280 132 L282 180 M300 134 L302 180 M360 158 L362 180" stroke="${L}" stroke-width="3"></path><path d="M190 160 C220 144 260 138 285 138" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="835" y="120" font-family="Chakra Petch" font-size="40" font-weight="700" fill="${L}">SJ</text><text x="828" y="150" font-family="IBM Plex Mono" font-size="16" font-weight="600" fill="${L}">AF 68-338</text></g>`),
    a10: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M880 200 L900 90 Q902 80 912 80 L960 80 Q970 80 970 90 L985 200 Z" fill="${c.base}"></path>
      <path id="stab" d="M850 232 L1000 232 L1000 244 L850 244 Z" fill="${c.panel}"></path>
      <path id="nacelle" d="M600 150 Q620 128 660 126 L840 126 Q880 128 880 150 L880 180 Q880 200 850 200 L600 200 Z" fill="${c.panel}"></path>
      <ellipse id="nacelle-face" cx="614" cy="163" rx="14" ry="36" fill="${sil ? c.base : '#1B1F24'}"></ellipse>
      <path id="fuselage-upper" d="M0 214 Q60 200 130 194 L420 192 Q600 196 720 200 L985 206 L1000 220 L1000 240 L0 240 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 214 L0 240 L1000 240 L1000 250 L880 262 L300 276 Q180 272 100 258 L60 236 Z" fill="${c.panel}"></path>
      <path id="outline" d="M0 214 Q60 200 130 194 L420 192 Q600 196 720 200 L985 206 L1000 220 L1000 250 L880 262 L300 276 Q180 272 100 258 L60 236 Z" fill="none"></path>
      <path id="wing" d="M420 250 L640 250 L640 264 L440 264 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 214 Q40 206 80 200 L80 248 L40 236 Z" fill="${c.radome}"></path>
      <rect id="gun" x="-30" y="222" width="40" height="8" fill="${sil ? c.base : '#0A0C0F'}"></rect>
      <rect id="nozzle" x="866" y="140" width="14" height="52" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M120 194 C140 140 220 122 290 132 C340 140 380 172 400 192 L135 194 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M170 160 C210 140 250 134 290 136" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="905" y="130" font-family="Chakra Petch" font-size="34" font-weight="700" fill="#8B9098">DM</text><text x="500" y="228" font-family="IBM Plex Mono" font-size="16" font-weight="600" fill="#8B9098">AF 80-0186</text></g>`),
    f14: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M650 186 L780 40 Q788 30 800 30 L880 30 Q892 30 894 42 L920 186 Z" fill="${c.base}"></path>
      <path id="stab" d="M820 236 L850 226 Q920 224 995 232 L998 248 L840 250 Z" fill="${c.panel}"></path>
      <path id="fuselage-upper" d="M0 220 Q70 198 140 184 L400 176 Q600 182 720 188 L985 194 L1000 212 L1000 238 L0 238 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 220 L0 238 L1000 238 L1000 252 L920 262 L400 274 Q340 274 330 262 L330 238 Q200 246 120 240 Z" fill="${c.panel}"></path>
      <path id="intake" d="M330 238 L340 200 L440 202 L440 268 Q380 274 330 262 Z" fill="${c.base}"></path>
      <rect id="intake-face" x="330" y="200" width="14" height="62" fill="${sil ? c.base : '#1B1F24'}"></rect>
      <path id="outline" d="M0 220 Q70 198 140 184 L400 176 Q600 182 720 188 L985 194 L1000 212 L1000 252 L920 262 L400 274 Q340 274 330 262 L330 238 Q200 246 120 240 Z" fill="none"></path>
      <path id="glove" d="M300 214 Q420 208 520 214 L520 224 Q420 222 300 224 Z" fill="${c.panel}"></path>
      <path id="wing" d="M480 250 Q640 242 800 248 L800 260 Q640 264 510 258 Z" fill="${c.panel}"></path>
      <path id="radome" d="M0 220 Q60 202 110 190 L110 246 L60 240 Z" fill="${c.radome}"></path>
      <rect id="nozzle" x="982" y="208" width="18" height="46" fill="${sil ? c.base : L}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M125 184 C165 136 280 122 360 138 C390 146 400 168 400 176 L140 182 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M270 128 L272 180" stroke="${L}" stroke-width="3"></path><path d="M170 158 C210 140 250 134 280 134" stroke="${GLINT}" stroke-width="3" fill="none" opacity="0.6"></path></g>
      <g id="markings"><text x="800" y="120" font-family="Chakra Petch" font-size="40" font-weight="700" fill="${L}">AJ</text><text x="470" y="216" font-family="IBM Plex Mono" font-size="18" font-weight="600" fill="${L}">NAVY</text></g>`),
    f117: (c, sil) => `<g id="airframe" stroke="${sil ? '#223347' : L}" stroke-width="3" stroke-linejoin="round">
      <path id="fin" d="M800 210 L880 110 Q886 102 896 102 L930 102 Q940 102 940 112 L985 210 Z" fill="${c.base}"></path>
      <path id="fuselage-upper" d="M0 250 L180 214 L360 180 L520 176 L900 200 L1000 218 L1000 236 L0 236 Z" fill="${c.base}"></path>
      <path id="fuselage-lower" d="M0 250 L0 236 L1000 236 L1000 246 L900 258 L300 264 L120 258 Z" fill="${c.panel}"></path>
      <path id="outline" d="M0 250 L180 214 L360 180 L520 176 L900 200 L1000 218 L1000 246 L900 258 L300 264 L120 258 Z" fill="none"></path>
      <path id="facet" d="M180 214 L300 264 M360 180 L400 260 M520 176 L560 262" stroke="${sil ? '#223347' : '#2A2E34'}" stroke-width="2" fill="none"></path>
      <rect id="nozzle" x="984" y="220" width="16" height="22" fill="${sil ? c.base : '#0A0C0F'}"></rect></g>` + (sil ? '' : `
      <g id="canopy"><path d="M200 210 L260 176 L400 172 L440 180 L360 181 Z" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path><path d="M320 174 L322 181" stroke="${L}" stroke-width="3"></path></g>
      <g id="markings"><text x="880" y="170" font-family="Chakra Petch" font-size="30" font-weight="700" fill="#3A3F45">HO</text><text x="600" y="230" font-family="IBM Plex Mono" font-size="14" font-weight="600" fill="#3A3F45">AF 85-816</text></g>`),
  };

  // alternate liveries: override colors + extra top-down markings
  const LIVERY = {
    t38: { nasa: { base: '#F2F4F6', panel: '#E4E8EC', radome: '#9AA1A8', trim: '#0B3D91', marksTop: `<rect x="-44" y="440" width="88" height="16" fill="#0B3D91"></rect><rect x="-44" y="462" width="88" height="5" fill="#C8312B"></rect><rect x="-6" y="860" width="12" height="120" fill="#0B3D91"></rect><text x="-160" y="705" font-family="IBM Plex Mono" font-size="30" font-weight="600" fill="#0B3D91" text-anchor="middle">NASA</text>`, marksSide: `<path d="M60 231 L984 231" stroke="#0B3D91" stroke-width="10"></path><path d="M60 238 L984 238" stroke="#C8312B" stroke-width="3"></path><path d="M760 120 L900 120 L910 150 L790 150 Z" fill="#0B3D91"></path><text x="800" y="178" font-family="IBM Plex Mono" font-size="18" font-weight="600" fill="#0B3D91">NASA 901</text>` } },
    f18: { blueangels: { base: '#1F3FA8', panel: '#2B4FC0', radome: '#1F3FA8', trim: '#F5B841', marksTop: `<path d="M0 140 L0 1000" stroke="#F5B841" stroke-width="10"></path><polygon points="120,520 372,650 372,660 130,540" fill="#F5B841"></polygon><polygon points="-120,520 -372,650 -372,660 -130,540" fill="#F5B841"></polygon><text x="-200" y="700" font-family="Chakra Petch" font-size="48" font-weight="700" fill="#F5B841" text-anchor="middle">1</text><text x="200" y="700" font-family="IBM Plex Mono" font-size="22" font-weight="600" fill="#F5B841" text-anchor="middle">NAVY</text>`, marksSide: `<path d="M110 206 Q500 200 985 200" stroke="#F5B841" stroke-width="8" fill="none"></path><text x="780" y="120" font-family="Chakra Petch" font-size="48" font-weight="700" fill="#F5B841">1</text><text x="430" y="230" font-family="Chakra Petch" font-size="22" font-weight="700" fill="#F5B841">BLUE ANGELS</text>` } },
  };
  // landing gear, side view (hangar only)
  const GEAR = {
    t38: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="150" y="262" width="10" height="50" fill="#8B9098"></rect><circle cx="155" cy="320" r="14" fill="#1B1F24"></circle><rect x="560" y="262" width="12" height="48" fill="#8B9098"></rect><circle cx="566" cy="320" r="16" fill="#1B1F24"></circle></g>`,
    f16: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="300" y="300" width="10" height="36" fill="#8B9098"></rect><circle cx="305" cy="340" r="14" fill="#1B1F24"></circle><rect x="620" y="296" width="12" height="38" fill="#8B9098"></rect><circle cx="626" cy="340" r="18" fill="#1B1F24"></circle></g>`,
    f15: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="230" y="268" width="10" height="56" fill="#8B9098"></rect><circle cx="235" cy="330" r="14" fill="#1B1F24"></circle><rect x="640" y="262" width="12" height="56" fill="#8B9098"></rect><circle cx="646" cy="326" r="18" fill="#1B1F24"></circle></g>`,
    f18: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="250" y="268" width="10" height="56" fill="#8B9098"></rect><circle cx="255" cy="330" r="14" fill="#1B1F24"></circle><rect x="640" y="262" width="12" height="56" fill="#8B9098"></rect><circle cx="646" cy="326" r="18" fill="#1B1F24"></circle></g>`,
    f22: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="250" y="270" width="10" height="50" fill="#8B9098"></rect><circle cx="255" cy="326" r="14" fill="#1B1F24"></circle><rect x="660" y="266" width="12" height="52" fill="#8B9098"></rect><circle cx="666" cy="324" r="18" fill="#1B1F24"></circle></g>`,
    f35: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="250" y="270" width="10" height="50" fill="#8B9098"></rect><circle cx="255" cy="326" r="14" fill="#1B1F24"></circle><rect x="640" y="280" width="12" height="42" fill="#8B9098"></rect><circle cx="646" cy="326" r="18" fill="#1B1F24"></circle></g>`,
    sr71: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="300" y="252" width="10" height="60" fill="#8B9098"></rect><circle cx="305" cy="318" r="14" fill="#1B1F24"></circle><rect x="700" y="250" width="14" height="56" fill="#8B9098"></rect><circle cx="697" cy="314" r="16" fill="#1B1F24"></circle><circle cx="721" cy="314" r="16" fill="#1B1F24"></circle></g>`,
    f4: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="220" y="270" width="10" height="56" fill="#8B9098"></rect><circle cx="225" cy="332" r="14" fill="#1B1F24"></circle><rect x="600" y="264" width="12" height="56" fill="#8B9098"></rect><circle cx="606" cy="328" r="18" fill="#1B1F24"></circle></g>`,
    a10: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="180" y="270" width="10" height="56" fill="#8B9098"></rect><circle cx="185" cy="332" r="14" fill="#1B1F24"></circle><rect x="520" y="264" width="12" height="56" fill="#8B9098"></rect><circle cx="526" cy="328" r="18" fill="#1B1F24"></circle></g>`,
    f14: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="240" y="270" width="10" height="56" fill="#8B9098"></rect><circle cx="245" cy="332" r="14" fill="#1B1F24"></circle><rect x="640" y="262" width="12" height="60" fill="#8B9098"></rect><circle cx="646" cy="330" r="18" fill="#1B1F24"></circle></g>`,
    f117: `<g id="gear" stroke="${L}" stroke-width="3"><rect x="280" y="262" width="10" height="46" fill="#8B9098"></rect><circle cx="285" cy="314" r="14" fill="#1B1F24"></circle><rect x="640" y="260" width="12" height="46" fill="#8B9098"></rect><circle cx="646" cy="312" r="16" fill="#1B1F24"></circle></g>`,
  };

  function render(type, variant, showFlame, livery) {
    const a = A[type] || A.f16;
    const sil = variant === 'silhouette';
    const lv = (!sil && livery && LIVERY[type] && LIVERY[type][livery]) || null;
    const c = sil ? { base: '#111B27', panel: '#111B27', radome: '#111B27' } : (lv ? { ...a, ...lv } : a);
    const stroke = sil ? '#223347' : L;
    let s = '';
    if (showFlame && !sil) s += flame(a.flameX, a.flameW, a.nozY || 1000);
    s += `<g id="airframe" fill="${c.base}" stroke="${stroke}" stroke-width="${sil ? 4 : 3}" stroke-linejoin="round">${a.parts(c)}<path id="fuselage" d="${a.body}"></path><path id="radome" d="${a.radomePath}" fill="${c.radome}"></path>${sil ? '' : nozzles(a.noz[0], a.noz[1], a.nozY || 1000)}</g>`;
    if (!sil) {
      s += `<g id="control-surfaces" stroke="${L}" stroke-width="2">${a.ctrl(c)}</g>`;
      s += a.canopyPath ? `<g id="canopy"><path d="${a.canopyPath}" fill="${CANOPY}" stroke="${L}" stroke-width="3"></path></g>` : canopy(a.canopy[0], a.canopy[1], a.canopy[2]);
      s += a.frames.map(y => `<path d="M${-a.canopy[2] + 4} ${y} L${a.canopy[2] - 4} ${y}" stroke="${L}" stroke-width="3"></path>`).join('');
      s += `<g id="markings">${lv ? lv.marksTop : a.marks(a)}</g>`;
    }
    return s;
  }

  class MoSprite extends HTMLElement {
    static get observedAttributes() { return ['type', 'length', 'variant', 'flame', 'heading', 'view', 'livery', 'gear']; }
    connectedCallback() { this.draw(); }
    attributeChangedCallback() { this.draw(); }
    draw() {
      const type = this.getAttribute('type') || 'f16';
      const len = +(this.getAttribute('length') || 120);
      const variant = this.getAttribute('variant') || 'livery';
      const heading = this.getAttribute('heading') || '0';
      const a = A[type] || A.f16;
      if (this.getAttribute('view') === 'side' && SIDE[type]) {
        const sil = variant === 'silhouette';
        const livery = this.getAttribute('livery');
        const lv = (!sil && livery && LIVERY[type] && LIVERY[type][livery]) || null;
        const c = sil ? { base: '#111B27', panel: '#111B27', radome: '#111B27' } : (lv ? { ...a, ...lv } : a);
        let side = SIDE[type](c, sil);
        if (lv) { const mi = side.indexOf('<g id="markings">'); if (mi > -1) side = side.slice(0, mi) + `<g id="markings">${lv.marksSide}</g>`; }
        if (this.hasAttribute('gear') && !sil && GEAR[type]) side += GEAR[type];
        this.style.display = 'inline-block'; this.style.width = len + 'px'; this.style.height = (len * 0.37) + 'px'; this.style.lineHeight = '0';
        this.innerHTML = `<svg viewBox="0 0 1000 370" width="${len}" height="${len * 0.37}" style="display:block;overflow:visible">${this.hasAttribute('flame') && !sil ? (type === 'sr71' ? `<polygon points="1000,200 1000,258 1140,229" fill="#F5B841" opacity="0.85"></polygon><polygon points="1000,212 1000,246 1080,229" fill="#FFF3C4"></polygon>` : `<polygon points="1000,205 1000,245 1120,225" fill="#F5B841" opacity="0.85"></polygon><polygon points="1000,213 1000,237 1070,225" fill="#FFF3C4"></polygon>`) : ''}${side}</svg>`;
        return;
      }
      const h = a.bogey ? len * 0.7 : len;
      const hw = a.halfW || 400;
      this.style.display = 'inline-block';
      this.style.width = (len * hw / 500) + 'px';
      this.style.height = h + 'px';
      this.style.lineHeight = '0';
      this.innerHTML = `<svg viewBox="${-hw} 0 ${hw * 2} ${a.bogey ? 700 : 1000}" width="${len * hw / 500}" height="${h}" style="display:block;overflow:visible;transform:rotate(${heading}deg)">${render(type, variant, this.hasAttribute('flame'), this.getAttribute('livery'))}</svg>`;
    }
  }
  if (!customElements.get('mo-sprite')) customElements.define('mo-sprite', MoSprite);
  window.MoSprites = { render, aircraft: A, side: SIDE, gear: GEAR, livery: LIVERY,
    renderSide(type, variant, showFlame, livery, gear) {
      const a = A[type]; if (!a || !SIDE[type]) return '';
      const sil = variant === 'silhouette';
      const lv = (!sil && livery && LIVERY[type] && LIVERY[type][livery]) || null;
      const c = sil ? { base: '#111B27', panel: '#111B27', radome: '#111B27' } : (lv ? { ...a, ...lv } : a);
      let s = SIDE[type](c, sil);
      if (lv) { const mi = s.indexOf('<g id="markings">'); if (mi > -1) s = s.slice(0, mi) + `<g id="markings">${lv.marksSide}</g>`; }
      if (gear && !sil && GEAR[type]) s += GEAR[type];
      if (showFlame && !sil) s = (type === 'sr71' ? `<g id="flame"><polygon points="1000,200 1000,258 1140,229" fill="#F5B841" opacity="0.85"></polygon><polygon points="1000,212 1000,246 1080,229" fill="#FFF3C4"></polygon></g>` : `<g id="flame"><polygon points="1000,205 1000,245 1120,225" fill="#F5B841" opacity="0.85"></polygon><polygon points="1000,213 1000,237 1070,225" fill="#FFF3C4"></polygon></g>`) + s;
      return s;
    } };
})();
