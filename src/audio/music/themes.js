// Bölge müzikleri. Melodiler sabit tohumla üretilir: her açılışta aynı şarkı çalar,
// ama hiçbirini elle notaya dökmek gerekmez. Yeni tema için THEME_DEFS'e bir giriş ekle.
//
// Desen dizgileri 16 adımlık bir ölçüdür (her karakter bir 16'lık): 'x' = çal, '.' = boş.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

const THEME_DEFS = {
  forest: {
    bpm: 112,
    root: 60, // C4
    scale: 'major',
    progression: [0, 5, 3, 4], // I – vi – IV – V
    kick: 'x.......x.......',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    bass: 'x..x..x.x..x..x.',
    rhythm: [0, 3, 6, 8, 10, 12, 14],
    lead: 'square',
    arp: true,
    seed: 11,
  },
  desert: {
    bpm: 100,
    root: 62, // D4
    scale: 'harmonicMinor',
    progression: [0, 0, 5, 4], // i – i – VI – V
    kick: 'x.....x...x.....',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.x.',
    bass: 'x.....x...x.....',
    rhythm: [0, 2, 3, 6, 8, 11, 12, 14],
    lead: 'sawtooth',
    arp: false,
    seed: 23,
  },
  ice: {
    bpm: 92,
    root: 57, // A3
    scale: 'minor',
    progression: [0, 5, 2, 6], // i – VI – III – VII
    kick: 'x...........x...',
    snare: '........x.......',
    hat: '....x.......x...',
    bass: 'x.......x.......',
    rhythm: [0, 4, 6, 8, 12],
    lead: 'triangle',
    arp: true,
    seed: 37,
  },
  lava: {
    bpm: 128,
    root: 52, // E3
    scale: 'phrygian',
    progression: [0, 1, 0, 6], // i – II – i – VII
    kick: 'x.x...x.x.x...x.',
    snare: '....x.......x..x',
    hat: '..x...x...x...x.',
    bass: 'x.xx..x.x.xx..x.',
    rhythm: [0, 2, 4, 7, 8, 10, 12, 15],
    lead: 'sawtooth',
    arp: false,
    seed: 41,
  },
  shadow: {
    bpm: 84,
    root: 55, // G3
    scale: 'harmonicMinor',
    progression: [0, 5, 3, 4], // i – VI – iv – V
    kick: 'x.......x..x....',
    snare: '........x.......',
    hat: '..x.......x.....',
    bass: 'x.......x..x....',
    rhythm: [0, 3, 6, 8, 11, 14],
    lead: 'triangle',
    arp: true,
    seed: 53,
  },
  sky: {
    bpm: 124,
    root: 65, // F4
    scale: 'major',
    progression: [0, 4, 5, 3], // I – V – vi – IV
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '.xx..xx..xx..xx.',
    bass: 'x..x..x...x..x..',
    rhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    lead: 'square',
    arp: true,
    seed: 67,
  },
  crystal: {
    bpm: 98,
    root: 58, // Bb3
    scale: 'dorian',
    progression: [0, 3, 4, 5], // i – IV – v – VI
    kick: 'x.....x...x.....',
    snare: '........x.......',
    hat: '..x..x....x..x..',
    bass: 'x..x......x..x..',
    rhythm: [0, 2, 5, 7, 8, 11, 14],
    lead: 'triangle',
    arp: true,
    seed: 71,
  },
};

const ZONE_THEMES = ['forest', 'desert', 'ice', 'lava', 'shadow', 'sky', 'crystal'];

const parse = (pattern) => [...pattern].map((c) => c === 'x');

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Her ölçü için melodi: güçlü vuruşlarda akor sesi, aralarda gam üzerinde adım. */
function composeMelody(def, rng) {
  return def.progression.map((chordDegree, bar) => {
    const steps = new Array(16).fill(null);
    let degree = chordDegree + 7; // bir oktav yukarıda gezin
    for (const step of def.rhythm) {
      const strong = step % 4 === 0;
      if (strong) {
        const chordTones = [0, 2, 4].map((d) => chordDegree + 7 + d);
        degree = chordTones[Math.floor(rng() * chordTones.length)];
      } else {
        degree += [-2, -1, 1, 2][Math.floor(rng() * 4)];
      }
      // Son ölçünün sonu: köke dön ki döngü yumuşak bağlansın
      if (bar === def.progression.length - 1 && step === def.rhythm[def.rhythm.length - 1]) degree = 7;
      steps[step] = degree;
    }
    return steps;
  });
}

/** Tema nesnesi: { bpm, root, scale, progression, kick[], snare[], hat[], bass[], melody[][], ... } */
export function buildTheme(zoneIndex, { boss = false } = {}) {
  const id = ZONE_THEMES[zoneIndex % ZONE_THEMES.length];
  const def = THEME_DEFS[id];
  const melody = composeMelody(def, seeded(def.seed));
  const theme = {
    id: boss ? `${id}-boss` : id,
    bpm: def.bpm,
    root: def.root,
    scale: SCALES[def.scale],
    progression: def.progression,
    kick: parse(def.kick),
    snare: parse(def.snare),
    hat: parse(def.hat),
    bass: parse(def.bass),
    melody,
    lead: def.lead,
    arp: def.arp,
    boss,
  };
  if (boss) {
    // Boss: daha hızlı, her 8'likte davul, minör akorlar ve sert melodi
    theme.bpm = Math.round(def.bpm * 1.15);
    theme.kick = parse('x.x.x.x.x.x.x.x.');
    theme.snare = parse('....x.......x.xx');
    theme.hat = parse('xxxxxxxxxxxxxxxx');
    theme.bass = parse('xxx.xxx.xxx.xxxx');
    theme.scale = SCALES.harmonicMinor;
    theme.lead = 'sawtooth';
    theme.arp = true;
  }
  return theme;
}

/** Gam derecesi → kökten yarım ton (oktav taşmalarını da çözer). */
export function degreeToSemitones(scale, degree) {
  const octave = Math.floor(degree / scale.length);
  const index = ((degree % scale.length) + scale.length) % scale.length;
  return scale[index] + 12 * octave;
}
