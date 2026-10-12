/* Levytsya pixel art: the lioness mascot and a Frogger-style board.
   Shared by the app (progress screen) and the website (attract mode). */
(function (global) {
  "use strict";

  // Same flat, chunky style as the жаба frog icon
  const PALETTE = {
    t: "#e8a848", // fur
    d: "#a0602a", // ears and paws
    p: "#dc5a78", // inner ears
    l: "#f8c878", // cheeks
    m: "#fbe3b0", // muzzle
    n: "#b84860", // nose
    k: "#000000", // pupils, mouth
    w: "#f8f8f8", // eyes
  };

  const LIONESS = [
    "................",
    "..dd........dd..",
    ".dppd......dppd.",
    ".dttttttttttttd.",
    ".tttttttttttttt.",
    ".ttwwttttttwwtt.",
    ".ttwkttttttkwtt.",
    ".tllttttttttllt.",
    ".ttttmmmmmmtttt.",
    ".ttmmmnnnnmmmtt.",
    ".ttmmmmnnmmmmtt.",
    ".ttmmkmmmmkmmtt.",
    "..ttmmkkkkmmtt..",
    "...tttmmmmttt...",
    "..dd.tttttt.dd..",
    ".ddd........ddd.",
  ];

  function spriteCanvas(rows, palette) {
    const c = document.createElement("canvas");
    c.width = rows[0].length;
    c.height = rows.length;
    const ctx = c.getContext("2d");
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (palette[ch]) {
          ctx.fillStyle = palette[ch];
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });
    return c;
  }

  /* Draw the lioness into any element as crisp pixels. */
  function mountLioness(canvas, scale) {
    const s = spriteCanvas(LIONESS, PALETTE);
    canvas.width = 16 * scale;
    canvas.height = 16 * scale;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s, 0, 0, canvas.width, canvas.height);
  }

  const COLORS = {
    road: "#000000", river: "#121250", median: "#7a3fa0", medianDark: "#552a72",
    hedge: "#48bc48", hedgeDark: "#1c6e28", lane: "#f8d848", label: "#f8d848",
    white: "#f8f8f8",
  };

  function drawCar(ctx, x, y, color, dir) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 3, 16, 8);
    ctx.fillRect(x + (dir > 0 ? 3 : 5), y + 1, 8, 3);
    ctx.fillStyle = "#9fe7ff";
    ctx.fillRect(x + (dir > 0 ? 9 : 5), y + 2, 2, 2);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 2, y + 10, 4, 3);
    ctx.fillRect(x + 10, y + 10, 4, 3);
    ctx.fillStyle = "#ffffaa";
    ctx.fillRect(dir > 0 ? x + 15 : x, y + 5, 1, 2);
  }

  function drawTruck(ctx, x, y, dir) {
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(x + (dir > 0 ? 0 : 8), y + 2, 24, 10);
    ctx.fillStyle = "#d84848";
    ctx.fillRect(x + (dir > 0 ? 24 : 0), y + 4, 8, 8);
    ctx.fillStyle = "#9fe7ff";
    ctx.fillRect(x + (dir > 0 ? 28 : 1), y + 5, 3, 3);
    ctx.fillStyle = "#111";
    [3, 12, 26].forEach((wx) => ctx.fillRect(x + (dir > 0 ? wx : 32 - wx - 4), y + 11, 4, 3));
  }

  function drawLog(ctx, x, y, len) {
    ctx.fillStyle = "#8a4a1a";
    ctx.fillRect(x, y + 3, len, 10);
    ctx.fillStyle = "#b8682a";
    ctx.fillRect(x + 2, y + 5, len - 4, 2);
    ctx.fillStyle = "#5a2a12";
    for (let i = 6; i < len - 4; i += 9) ctx.fillRect(x + i, y + 9, 3, 1);
    ctx.fillStyle = "#d89a5a";
    ctx.fillRect(x, y + 3, 2, 10);
    ctx.fillRect(x + len - 2, y + 3, 2, 10);
  }

  function drawTurtle(ctx, x, y, t) {
    ctx.fillStyle = "#48bc48";
    ctx.fillRect(x + 2, y + 4, 10, 8);
    ctx.fillStyle = "#d84848";
    ctx.fillRect(x + 4, y + 5, 6, 6);
    ctx.fillStyle = "#48bc48";
    ctx.fillRect(x + (t % 2 ? 12 : 11), y + 6, 3, 3);
    ctx.fillRect(x + 1, y + 3, 2, 2);
    ctx.fillRect(x + 1, y + 11, 2, 2);
  }

  /* Lane presets, one look per tool. */
  const LANE_STYLES = {
    stabilize: { type: "road", kind: "car", color: "#f8d848", speed: 22, gap: 60 },
    trim: { type: "road", kind: "truck", speed: -16, gap: 90 },
    clean: { type: "river", kind: "log", speed: 14, gap: 70 },
    watermark: { type: "road", kind: "car", color: "#dc5a78", speed: -30, gap: 52 },
    subtitles: { type: "river", kind: "turtle", speed: -12, gap: 40 },
    demo1: { type: "road", kind: "car", color: "#48c8f8", speed: 26, gap: 56 },
    demo2: { type: "river", kind: "turtle", speed: -12, gap: 40 },
  };

  const W = 224, HOME_H = 24, LANE_H = 24, MED_H = 12;
  const LX = 188; // the lioness crosses on the right, clear of the lane labels

  /**
   * LevBoard(canvas, lanes, options)
   *   lanes: [{ style: "stabilize" | ..., label: "STABILIZE" }] bottom to top
   *   options.demo: true -> the lioness crosses by herself, forever
   * Methods: set(stageIndex, progress), finish(), fail(), destroy()
   */
  function LevBoard(canvas, lanes, options) {
    options = options || {};
    const n = lanes.length;
    const H = HOME_H + n * (LANE_H + MED_H);
    const scale = options.scale || 3;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    const lioness = spriteCanvas(LIONESS, PALETTE);
    const traffic = lanes.map((lane) => {
      const st = LANE_STYLES[lane.style] || LANE_STYLES.demo1;
      const items = [];
      for (let x = 0; x < W + 120; x += st.gap + Math.random() * st.gap * 0.6) items.push(x);
      return { st, items };
    });
    // vertical layout, top to bottom: home, then lane/median pairs (last stage first)
    const laneTop = (k) => HOME_H + (n - 1 - k) * (LANE_H + MED_H);
    const medianTop = (k) => laneTop(k) + LANE_H;      // the platform below lane k
    const restY = (k) => (k >= n ? HOME_H / 2 : medianTop(k) + MED_H / 2);

    let stage = 0, hops = 0, state = "play", flash = 0, raf = 0, last = performance.now();
    let pos = { y: restY(0), from: restY(0), to: restY(0), t: 1 };
    let demoP = 0;

    function targetY() {
      if (state === "done") return restY(n);
      const from = restY(stage), to = restY(stage + 1);
      return from + (to - from) * (hops / 3);
    }
    function hopTo(y) {
      if (Math.abs(y - pos.to) < 0.1) return;
      pos = { y: pos.y, from: pos.y, to: y, t: 0 };
      if (options.onHop) options.onHop();
    }

    function set(k, p) {
      if (state !== "play") return;
      k = Math.max(0, Math.min(n - 1, k));
      if (k !== stage) { stage = k; hops = 0; }
      hops = Math.min(Math.floor(p * 3), 2);
      hopTo(targetY());
    }
    function finish() { state = "done"; hopTo(restY(n)); }
    function fail() { state = "splat"; }

    function drawLabel(text, x, y, color) {
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#000";
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }

    function render(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // home hedge with five bays
      ctx.fillStyle = COLORS.hedge;
      ctx.fillRect(0, 0, W, HOME_H);
      ctx.fillStyle = COLORS.hedgeDark;
      for (let x = 0; x < W; x += 8) ctx.fillRect(x + (x / 8 % 2) * 4, 2, 3, 3);
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = COLORS.river;
        ctx.fillRect(176 - (4 - b) * 41, 6, 24, 18);
      }

      lanes.forEach((lane, k) => {
        const tr = traffic[k];
        const y0 = laneTop(k);
        ctx.fillStyle = tr.st.type === "river" ? COLORS.river : COLORS.road;
        ctx.fillRect(0, y0, W, LANE_H);
        if (tr.st.type === "road") {
          ctx.fillStyle = "#333";
          for (let x = 0; x < W; x += 16) ctx.fillRect(x, y0 + LANE_H / 2, 8, 1);
        } else {
          ctx.fillStyle = "#48c8f8";
          for (let x = (now / 40) % 12; x < W; x += 12) ctx.fillRect(x, y0 + 6, 3, 1);
        }
        // traffic
        const span = W + 120;
        tr.items = tr.items.map((x) => (x + tr.st.speed * dt + span) % span);
        tr.items.forEach((x) => {
          const dx = x - 60;
          const yy = y0 + 4;
          if (tr.st.kind === "car") drawCar(ctx, dx, yy, tr.st.color, tr.st.speed);
          else if (tr.st.kind === "truck") drawTruck(ctx, dx, yy, tr.st.speed);
          else if (tr.st.kind === "log") drawLog(ctx, dx, yy, 40);
          else drawTurtle(ctx, dx, yy, Math.floor(now / 400));
        });
        // median below the lane, with the level label
        const m0 = medianTop(k);
        ctx.fillStyle = COLORS.median;
        ctx.fillRect(0, m0, W, MED_H);
        ctx.fillStyle = COLORS.medianDark;
        for (let x = 0; x < W; x += 4) ctx.fillRect(x, m0 + ((x / 4) % 2 ? 2 : 8), 2, 2);
        const doneLane = k < stage || state === "done";
        drawLabel(`${k + 1} ${lane.label}`, 4, m0 + 10, doneLane ? "#96e678" : COLORS.label);
      });

      // lioness hop tween
      if (pos.t < 1) {
        pos.t = Math.min(pos.t + dt / 0.18, 1);
        pos.y = pos.from + (pos.to - pos.from) * pos.t;
      }
      const lift = pos.t < 1 ? Math.sin(pos.t * Math.PI) * 3 : 0;
      const squash = pos.t < 1 ? 1 + Math.sin(pos.t * Math.PI) * 0.15 : 1;
      if (state === "splat") {
        ctx.fillStyle = "#d84848";
        ctx.fillRect(LX - 9, pos.y - 2, 18, 4);
        ctx.fillRect(LX - 2, pos.y - 8, 4, 16);
        ctx.fillRect(LX - 6, pos.y - 6, 12, 12);
      } else {
        const sw = 16, sh = 16 * squash;
        ctx.drawImage(lioness, LX - sw / 2, pos.y - sh / 2 - lift, sw, sh);
      }

      if (state === "done") {
        flash += dt;
        if (Math.floor(flash * 3) % 2 === 0) drawLabel("HOME!", LX - 70, 16, "#ffffff");
      }

      if (options.demo) {
        demoP += dt * 0.55;
        if (state === "play") {
          if (demoP >= 1) {
            demoP = 0;
            if (stage < n - 1) set(stage + 1, 0);
            else finish();
          } else set(stage, demoP);
        } else if (state === "done" && flash > 2.4) {
          state = "play"; stage = 0; hops = 0; flash = 0; demoP = 0;
          pos = { y: restY(0), from: restY(0), to: restY(0), t: 1 };
        }
      }
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return { set, finish, fail, destroy: () => cancelAnimationFrame(raf) };
  }

  global.Levytsya = { LevBoard, mountLioness, LANE_STYLES };
})(window);
