const canvas = document.getElementById("ladderCanvas");
const ctx = canvas.getContext("2d");
const playerCountInput = document.getElementById("playerCount");
const regenBtn = document.getElementById("regenBtn");
const resetBtn = document.getElementById("resetBtn");
const topLabels = document.getElementById("topLabels");
const bottomLabels = document.getElementById("bottomLabels");
const pickButtons = document.getElementById("pickButtons");
const resultEl = document.getElementById("result");

const layout = {
  padX: 70,
  padTop: 24,
  padBottom: 24,
};

let state = {
  count: 6,
  rowCount: 15,
  rows: [],
  topEntries: [],
  bottomEntries: [],
  pathPoints: [],
  animProgress: 0,
  animFrame: null,
};

function clampCount(value) {
  return Math.max(3, Math.min(10, Number(value) || 6));
}

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRows(count) {
  const rungCount = Math.max(12, count * 3);
  const rows = [];

  for (let r = 0; r < rungCount; r += 1) {
    const row = new Array(count - 1).fill(false);
    const candidates = shuffled(Array.from({ length: count - 1 }, (_, i) => i));

    for (const i of candidates) {
      if (row[i]) continue;
      if (i > 0 && row[i - 1]) continue;
      if (i < row.length - 1 && row[i + 1]) continue;
      if (Math.random() < 0.34) {
        row[i] = true;
      }
    }

    rows.push(row);
  }

  return { rows, rowCount: rungCount + 1 };
}

function laneX(index, count) {
  const usableWidth = canvas.width - layout.padX * 2;
  if (count === 1) return canvas.width / 2;
  return layout.padX + (usableWidth * index) / (count - 1);
}

function rowY(rowIndex, rowCount) {
  const usableHeight = canvas.height - layout.padTop - layout.padBottom;
  return layout.padTop + (usableHeight * rowIndex) / (rowCount - 1);
}

function setLabels() {
  const columns = `repeat(${state.count}, 1fr)`;
  topLabels.style.gridTemplateColumns = columns;
  bottomLabels.style.gridTemplateColumns = columns;

  topLabels.innerHTML = "";
  bottomLabels.innerHTML = "";

  for (let i = 1; i <= state.count; i += 1) {
    const top = document.createElement("input");
    top.className = `slot-input${i === 1 ? " fixed" : ""}`;
    top.type = "text";
    top.value = state.topEntries[i - 1];
    top.placeholder = `${i}번`;
    top.setAttribute("aria-label", `상단 ${i}번 입력`);
    top.addEventListener("input", (e) => {
      state.topEntries[i - 1] = e.target.value;
    });
    topLabels.append(top);

    const bottom = document.createElement("input");
    bottom.className = `slot-input${i === 1 ? " fixed" : ""}`;
    bottom.type = "text";
    bottom.value = state.bottomEntries[i - 1];
    bottom.placeholder = `${i}번`;
    bottom.setAttribute("aria-label", `하단 ${i}번 입력`);
    bottom.addEventListener("input", (e) => {
      state.bottomEntries[i - 1] = e.target.value;
    });
    bottomLabels.append(bottom);
  }
}

function setPickButtons() {
  pickButtons.innerHTML = "";
  for (let i = 1; i <= state.count; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${i}번`;
    btn.addEventListener("click", () => runPick(i - 1));
    pickButtons.append(btn);
  }
}

function getMapping() {
  const map = [];
  for (let start = 0; start < state.count; start += 1) {
    let col = start;
    for (const row of state.rows) {
      if (row[col]) {
        col += 1;
      } else if (col > 0 && row[col - 1]) {
        col -= 1;
      }
    }
    map[start] = col;
  }
  return map;
}

function buildPath(startCol) {
  let col = startCol;
  const points = [{ x: laneX(col, state.count), y: rowY(0, state.rowCount) }];

  for (let r = 0; r < state.rows.length; r += 1) {
    const y = rowY(r, state.rowCount);
    const nextY = rowY(r + 1, state.rowCount);
    points.push({ x: laneX(col, state.count), y });

    const row = state.rows[r];
    if (row[col]) {
      col += 1;
      points.push({ x: laneX(col, state.count), y });
    } else if (col > 0 && row[col - 1]) {
      col -= 1;
      points.push({ x: laneX(col, state.count), y });
    }

    points.push({ x: laneX(col, state.count), y: nextY });
  }

  return { points, endCol: col };
}

function drawBase() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gridTop = rowY(0, state.rowCount);
  const gridBottom = rowY(state.rowCount - 1, state.rowCount);

  ctx.lineCap = "round";

  for (let c = 0; c < state.count; c += 1) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1f1b16";
    const x = laneX(c, state.count);
    ctx.moveTo(x, gridTop);
    ctx.lineTo(x, gridBottom);
    ctx.stroke();
  }

  for (let r = 0; r < state.rows.length; r += 1) {
    const y = rowY(r, state.rowCount);
    const row = state.rows[r];
    for (let i = 0; i < row.length; i += 1) {
      if (!row[i]) continue;
      const x1 = laneX(i, state.count);
      const x2 = laneX(i + 1, state.count);
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#1f1b16";
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }
  }
}

function drawAnimatedPath() {
  if (!state.pathPoints.length) return;

  let remaining = state.animProgress;
  ctx.beginPath();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#1e88e5";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let i = 0; i < state.pathPoints.length - 1; i += 1) {
    const a = state.pathPoints[i];
    const b = state.pathPoints[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (i === 0) ctx.moveTo(a.x, a.y);

    if (remaining >= segLen) {
      ctx.lineTo(b.x, b.y);
      remaining -= segLen;
      continue;
    }

    if (remaining > 0) {
      const t = remaining / segLen;
      ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
    break;
  }

  ctx.stroke();
}

function render() {
  drawBase();
  drawAnimatedPath();
}

function totalPathLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

function clearAnimation() {
  if (state.animFrame) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }
  state.pathPoints = [];
  state.animProgress = 0;
  Array.from(pickButtons.children).forEach((btn) => btn.classList.remove("active"));
  render();
}

function defaultTopEntry(index) {
  return `${index + 1}번`;
}

function defaultBottomEntry(index) {
  return `${index + 1}번`;
}

function syncEntries() {
  state.topEntries = Array.from({ length: state.count }, (_, i) =>
    state.topEntries[i] ?? defaultTopEntry(i)
  );
  state.bottomEntries = Array.from({ length: state.count }, (_, i) =>
    state.bottomEntries[i] ?? defaultBottomEntry(i)
  );
}

function entryText(list, index, fallbackFactory) {
  const raw = (list[index] ?? "").trim();
  return raw || fallbackFactory(index);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function animatePath(onDone) {
  if (state.animFrame) cancelAnimationFrame(state.animFrame);
  const points = state.pathPoints;
  const length = totalPathLength(points);
  const duration = 900;
  const startTs = performance.now();

  function tick(ts) {
    const ratio = Math.min(1, (ts - startTs) / duration);
    state.animProgress = length * (1 - Math.pow(1 - ratio, 2));
    render();
    if (ratio < 1) {
      state.animFrame = requestAnimationFrame(tick);
    } else {
      state.animFrame = null;
      onDone();
    }
  }

  state.animFrame = requestAnimationFrame(tick);
}

function runPick(startCol) {
  Array.from(pickButtons.children).forEach((btn, index) => {
    btn.classList.toggle("active", index === startCol);
  });

  const { points, endCol } = buildPath(startCol);
  state.pathPoints = points;
  state.animProgress = 0;

  animatePath(() => {
    const startNum = startCol + 1;
    const endNum = endCol + 1;
    const startLabel = entryText(state.topEntries, startCol, defaultTopEntry);
    const endLabel = entryText(state.bottomEntries, endCol, defaultBottomEntry);
    const fixedText =
      startNum === 1
        ? " (주작 성공: 1번은 항상 1번)"
        : "";
    resultEl.innerHTML = `<strong>${startNum}번</strong> (${escapeHtml(startLabel)}) → <strong>${endNum}번</strong> (${escapeHtml(endLabel)})${fixedText}`;
  });
}

function validateRiggedRule() {
  const mapping = getMapping();
  return mapping[0] === 0 && mapping.slice(1).every((v) => v !== 0);
}

function rebuild() {
  state.count = clampCount(playerCountInput.value);
  playerCountInput.value = state.count;
  syncEntries();

  clearAnimation();
  resultEl.textContent = "번호를 선택하세요.";

  let built;
  do {
    built = buildRows(state.count);
    state.rows = built.rows;
    state.rowCount = built.rowCount;
  } while (!validateRiggedRule());

  setLabels();
  setPickButtons();
  render();
}

regenBtn.addEventListener("click", rebuild);
resetBtn.addEventListener("click", () => {
  clearAnimation();
  resultEl.textContent = "번호를 선택하세요.";
});

playerCountInput.addEventListener("change", rebuild);

rebuild();
