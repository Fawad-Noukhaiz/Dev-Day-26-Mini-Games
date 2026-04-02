import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

class SoundEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  pop(score = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 520 + Math.min(score * 14, 700);

    const o1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    o1.connect(g1).connect(this.ctx.destination);
    o1.type = "sine";
    o1.frequency.setValueAtTime(f, t);
    o1.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.06);
    g1.gain.setValueAtTime(0.22, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o1.start(t);
    o1.stop(t + 0.13);

    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.connect(g2).connect(this.ctx.destination);
    o2.type = "sine";
    o2.frequency.value = f * 1.5;
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.13, t + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o2.start(t + 0.03);
    o2.stop(t + 0.16);
  }

  milestone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [784, 988, 1175, 1568].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g).connect(this.ctx.destination);
      o.type = "sine";
      o.frequency.value = f;
      const s = t + i * 0.07;
      g.gain.setValueAtTime(0.14, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.18);
      o.start(s);
      o.stop(s + 0.18);
    });
  }

  gameOver() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const flt = this.ctx.createBiquadFilter();
    o.connect(flt).connect(g).connect(this.ctx.destination);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 1.1);
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(2200, t);
    flt.frequency.exponentialRampToValueAtTime(180, t + 1);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    o.start(t);
    o.stop(t + 1.15);

    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.connect(g2).connect(this.ctx.destination);
    o2.type = "sine";
    o2.frequency.setValueAtTime(140, t);
    o2.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    g2.gain.setValueAtTime(0.28, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o2.start(t);
    o2.stop(t + 0.55);
  }

  start() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g).connect(this.ctx.destination);
      o.type = "sine";
      o.frequency.value = f;
      const s = t + i * 0.09;
      g.gain.setValueAtTime(0.16, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.19);
      o.start(s);
      o.stop(s + 0.19);
    });
  }
}

const sfx = new SoundEngine();

const COLORS = [
  "#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3",
  "#54a0ff", "#5f27cd", "#01a3a4", "#f368e0",
  "#ff6348", "#7bed9f", "#70a1ff", "#ffa502",
  "#e056fd", "#7158e2", "#3ae374", "#ff3838",
];

const radius = (s) => Math.max(18, 72 - s * 1.2);
const timeMs = (s) => Math.max(750, 3000 - s * 50);

const Particle = React.memo(({ x, y, color, angle, speed, size }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dx = Math.cos(angle) * speed * 26;
    const dy = Math.sin(angle) * speed * 26;
    el.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(0)`, opacity: 0 },
      ],
      {
        duration: 420 + Math.random() * 260,
        easing: "cubic-bezier(.2,.9,.3,1)",
        fill: "forwards",
      }
    );
  }, [angle, speed]);
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 ${size + 3}px ${color}`,
        pointerEvents: "none",
        zIndex: 15,
      }}
    />
  );
});

const PopUp = React.memo(({ x, y, text, color }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [
        { transform: "translateY(0) scale(.6)", opacity: 1 },
        { transform: "translateY(-52px) scale(1.3)", opacity: 0 },
      ],
      { duration: 680, easing: "ease-out", fill: "forwards" }
    );
  }, []);
  return (
    <div
      ref={ref}
      className="popup"
      style={{ left: x, top: y - 14, color: color || "#fff", textShadow: `0 0 12px ${color}` }}
    >
      {text}
    </div>
  );
});

const Stars = React.memo(() => {
  const data = useRef(
    Array.from({ length: 90 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: 1 + Math.random() * 2,
      o: 0.15 + Math.random() * 0.45,
      d: 2 + Math.random() * 4,
      dl: Math.random() * 3,
    }))
  ).current;
  return (
    <div className="stars-wrap">
      {data.map((st, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            opacity: st.o,
            animationDuration: `${st.d}s`,
            animationDelay: `${st.dl}s`,
          }}
        />
      ))}
    </div>
  );
});

export default function App() {
  const [view, setView] = useState("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() =>
    parseInt(localStorage.getItem("cf_best") || "0", 10)
  );
  const [circle, setCircle] = useState(null);
  const [ratio, setRatio] = useState(1);
  const [particles, setParticles] = useState([]);
  const [popups, setPopups] = useState([]);
  const [flash, setFlash] = useState(null);

  const areaRef = useRef(null);
  const rafRef = useRef(null);
  const t0 = useRef(0);
  const limit = useRef(3000);
  const sRef = useRef(0);
  const vRef = useRef("menu");
  const uid = useRef(0);

  useEffect(() => { sRef.current = score; }, [score]);
  useEffect(() => { vRef.current = view; }, [view]);

  const spawn = useCallback((s) => {
    const el = areaRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const r = radius(s);
    const px = r + 20;
    const topPad = 100;                       
    const x = px + Math.random() * Math.max(1, width - px * 2);
    const y = topPad + Math.random() * Math.max(1, height - topPad - px);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    limit.current = timeMs(s);
    t0.current = performance.now();
    setCircle({ x, y, r, color, k: uid.current++ });
    setRatio(1);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      if (vRef.current !== "play") return;
      const rem = 1 - (now - t0.current) / limit.current;
      if (rem <= 0) { setRatio(0); doGameOver(); return; }
      setRatio(rem);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const doGameOver = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    sfx.gameOver();
    setView("over");
    vRef.current = "over";
    setCircle(null);
    const s = sRef.current;
    const b = parseInt(localStorage.getItem("cf_best") || "0", 10);
    if (s > b) { localStorage.setItem("cf_best", String(s)); setBest(s); }
  }, []);

  const startGame = useCallback(() => {
    sfx.init();
    sfx.start();
    setScore(0); sRef.current = 0;
    setParticles([]); setPopups([]); setFlash(null); setCircle(null);
    setView("play"); vRef.current = "play";
    setTimeout(() => spawn(0), 320);
  }, [spawn]);

  const hitCircle = useCallback(
    (e) => {
      e.stopPropagation();
      if (vRef.current !== "play" || !circle) return;
      const s = sRef.current + 1;
      setScore(s); sRef.current = s;

      s % 10 === 0 ? sfx.milestone() : sfx.pop(s);

      const n = Math.min(20, 8 + Math.floor(s / 4));
      const pArr = Array.from({ length: n }, (_, i) => ({
        id: uid.current++,
        x: circle.x, y: circle.y, color: circle.color,
        angle: (i / n) * Math.PI * 2 + (Math.random() - .5) * .5,
        speed: 1 + Math.random() * 3.8,
        size: 2.5 + Math.random() * 5.5,
      }));
      setParticles((p) => [...p, ...pArr]);
      const ids = new Set(pArr.map((p) => p.id));
      setTimeout(() => setParticles((p) => p.filter((v) => !ids.has(v.id))), 820);

      const pid = uid.current++;
      const txt = s % 10 === 0 ? `🔥 ${s}!` : "+1";
      const pcol = s % 10 === 0 ? "#feca57" : circle.color;
      setPopups((p) => [...p, { id: pid, x: circle.x, y: circle.y, text: txt, color: pcol }]);
      setTimeout(() => setPopups((p) => p.filter((v) => v.id !== pid)), 820);

      setFlash(circle.color);
      setTimeout(() => setFlash(null), 140);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      spawn(s);
    },
    [circle, spawn]
  );

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const Ring = () => {
    if (!circle) return null;
    const pad = 13, sw = 3.5;
    const R = circle.r + pad;
    const C = 2 * Math.PI * R;
    const off = C * (1 - ratio);
    const col = ratio > .5 ? "#4ade80" : ratio > .25 ? "#facc15" : "#ef4444";
    const cx = R + sw + 2, cy = cx, sz = cx * 2;
    return (
      <svg width={sz} height={sz} style={{
        position: "absolute", left: circle.x - cx, top: circle.y - cy,
        pointerEvents: "none", zIndex: 4,
        filter: `drop-shadow(0 0 8px ${col}80)`,
      }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke .3s" }} />
      </svg>
    );
  };

  if (view === "menu") return (
    <div className="scene">
      <Stars />
      <div className="center-col">
        <h1 className="title"><span className="tc">Click</span>{" "}<span className="tf">Frenzy</span></h1>
        <p className="tagline">Click the circles before time runs out!</p>
        <div className="rules">
          <span>Circles shrink each round</span>
          <span>Time gets shorter</span>
          <span>Chase the high score!</span>
        </div>
        {best > 0 && <p className="hs-menu">🏆 Best: {best}</p>}
        <button className="btn glow" onClick={startGame}>START GAME</button>
      </div>

      {/* decorative floating circles */}
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="deco-circle" style={{
          left: `${8 + Math.random() * 84}%`, top: `${8 + Math.random() * 84}%`,
          width: 14 + Math.random() * 36, height: 14 + Math.random() * 36,
          backgroundColor: COLORS[i % COLORS.length],
          opacity: .08 + Math.random() * .12,
          animationDuration: `${3 + Math.random() * 5}s`,
          animationDelay: `${Math.random() * 3}s`,
        }} />
      ))}
    </div>
  );

  if (view === "over") {
    const isNew = score > 0 && score >= best;
    return (
      <div className="scene shake-once">
        <Stars />
        <div className="center-col">
          <h1 className="go-title">GAME OVER</h1>
          <p className="go-label">SCORE</p>
          <p className="go-value">{score}</p>
          {isNew && <p className="new-best">🎉 NEW HIGH SCORE! 🎉</p>}
          <p className="go-best">Best: {best}</p>
          <button className="btn glow" onClick={startGame}>PLAY AGAIN</button>
          <button className="btn sec" onClick={() => setView("menu")}>MENU</button>
        </div>
      </div>
    );
  }

  const barCol = ratio > .5 ? "#4ade80" : ratio > .25 ? "#facc15" : "#ef4444";
  return (
    <div className="scene">
      <Stars />

      {flash && <div className="flash" style={{ boxShadow: `inset 0 0 140px ${flash}55` }} />}

      {/* top bar */}
      <div className="bar-track">
        <div className="bar-fill" style={{
          width: `${ratio * 100}%`, backgroundColor: barCol,
          boxShadow: `0 0 14px ${barCol}90`,
        }} />
      </div>

      {/* HUD */}
      <div className="hud">
        <div className="hud-left">
          <span className="hud-lbl">SCORE</span>
          <span className="hud-val" key={score}>{score}</span>
        </div>
        <div className="hud-right">
          <span className="hud-lbl">BEST</span>
          <span className="hud-best-val">{best}</span>
        </div>
      </div>

      {/* difficulty info */}
      <div className="diff-info">
        <span>⏱ {(timeMs(score) / 1000).toFixed(1)}s</span>
        <span>◎ {Math.round(radius(score) * 2)}px</span>
      </div>

      {/* arena */}
      <div className="arena" ref={areaRef}>
        <Ring />

        {circle && (
          <div
            key={circle.k}
            className={`target ${ratio < .28 ? "warn" : ""}`}
            onClick={hitCircle}
            style={{
              left: circle.x - circle.r, top: circle.y - circle.r,
              width: circle.r * 2, height: circle.r * 2,
              backgroundColor: circle.color,
              boxShadow: `0 0 ${circle.r * .55}px ${circle.color},
                          0 0 ${circle.r * 1.1}px ${circle.color}45,
                          inset 0 0 ${circle.r * .35}px rgba(255,255,255,.22)`,
            }}
          >
            <div className="highlight" />
          </div>
        )}

        {particles.map((p) => <Particle key={p.id} {...p} />)}
        {popups.map((p) => <PopUp key={p.id} {...p} />)}
      </div>
    </div>
  );
}