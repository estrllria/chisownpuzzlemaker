document.addEventListener("DOMContentLoaded", () => {
  // Customize text here:
  const COMPLETION_MESSAGE = "i love you — always.";
  const NOTE_TEXT = "our love story is a puzzle — piece by piece, we complete it.";

  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");
  const dragLayer = document.getElementById("dragLayer");

  const fileEl = document.getElementById("file");
  const gridEl = document.getElementById("grid");
  const shuffleBtn = document.getElementById("shuffleBtn");

  const previewImg = document.getElementById("previewImg");
  const noteText = document.getElementById("noteText");

  const revealEl = document.getElementById("reveal");
  const againBtn = document.getElementById("again");
  const customMsgEl = document.getElementById("customMsg");

  const confettiEl = document.getElementById("confetti");

  customMsgEl.textContent = COMPLETION_MESSAGE;
  noteText.textContent = NOTE_TEXT;

  let imgSrc = "https://images.unsplash.com/photo-1520975958225-9c224fa29f4a?auto=format&fit=crop&w=1200&q=80";
  previewImg.src = imgSrc;

  let N = parseInt(gridEl.value, 10);
  let edges = null; // edges[r][c] = {t,r,b,l} in {-1,0,1}

  // Drag state
  let dragging = null; // {el, id, originParent, originNextSibling, pointerId}
  let lastPointer = {x:0,y:0};

  function makeEdgeMap(n){
    const e = Array.from({length:n}, () =>
      Array.from({length:n}, () => ({t:0,r:0,b:0,l:0}))
    );

    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        e[r][c].t = (r===0) ? 0 : null;
        e[r][c].l = (c===0) ? 0 : null;
        e[r][c].b = (r===n-1) ? 0 : null;
        e[r][c].r = (c===n-1) ? 0 : null;
      }
    }

    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(e[r][c].r === null){
          const val = Math.random() > 0.5 ? 1 : -1;
          e[r][c].r = val;
          e[r][c+1].l = -val;
        }
        if(e[r][c].b === null){
          const val = Math.random() > 0.5 ? 1 : -1;
          e[r][c].b = val;
          e[r+1][c].t = -val;
        }
      }
    }
    return e;
  }

  // jigsaw path in 100x100 viewBox
  function piecePath(e){
    const w=100, h=100;
    const s = 23;
    const n = 8;
    const c = 9;

    function top(){
      if(e.t === 0) return `H ${w}`;
      const dir = e.t;           // 1 out(up), -1 in(down)
      const yOut = -dir * s;
      return `
        H ${w/2 - s}
        C ${w/2 - s + c} 0, ${w/2 - n} ${yOut}, ${w/2} ${yOut}
        C ${w/2 + n} ${yOut}, ${w/2 + s - c} 0, ${w/2 + s} 0
        H ${w}
      `;
    }

    function right(){
      if(e.r === 0) return `V ${h}`;
      const dir = e.r;           // 1 out(right), -1 in(left)
      const xOut = w + dir * s;
      return `
        V ${h/2 - s}
        C ${w} ${h/2 - s + c}, ${xOut} ${h/2 - n}, ${xOut} ${h/2}
        C ${xOut} ${h/2 + n}, ${w} ${h/2 + s - c}, ${w} ${h/2 + s}
        V ${h}
      `;
    }

    function bottom(){
      if(e.b === 0) return `H 0`;
      const dir = e.b;           // 1 out(down), -1 in(up)
      const yOut = h + dir * s;
      return `
        H ${w/2 + s}
        C ${w/2 + s - c} ${h}, ${w/2 + n} ${yOut}, ${w/2} ${yOut}
        C ${w/2 - n} ${yOut}, ${w/2 - s + c} ${h}, ${w/2 - s} ${h}
        H 0
      `;
    }

    function left(){
      if(e.l === 0) return `V 0`;
      const dir = e.l;           // 1 out(left), -1 in(right)
      const xOut = -dir * s;
      return `
        V ${h/2 + s}
        C 0 ${h/2 + s - c}, ${xOut} ${h/2 + n}, ${xOut} ${h/2}
        C ${xOut} ${h/2 - n}, 0 ${h/2 - s + c}, 0 ${h/2 - s}
        V 0
      `;
    }

    return `M 0 0 ${top()} ${right()} ${bottom()} ${left()} Z`.replace(/\s+/g," ").trim();
  }

  function pieceSVG(r,c){
    const id = `p-${r}-${c}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const d = piecePath(edges[r][c]);
    const clipId = `clip-${id}`;

    return {
      id,
      svg: `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <clipPath id="${clipId}">
              <path d="${d}"></path>
            </clipPath>
          </defs>

          <g clip-path="url(#${clipId})">
            <image href="${imgSrc}"
                   x="${-c*100}" y="${-r*100}"
                   width="${N*100}" height="${N*100}"
                   preserveAspectRatio="xMidYMid slice"></image>
            <path d="M0 0 H100 V34 C70 22 40 20 0 28 Z" fill="rgba(255,255,255,.22)"></path>
          </g>

          <path d="${d}" fill="none" stroke="rgba(60,40,50,.20)" stroke-width="1.6"></path>
        </svg>
      `
    };
  }

  function build(){
    N = parseInt(gridEl.value, 10);
    edges = makeEdgeMap(N);

    previewImg.src = imgSrc;

    // board slots
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${N}, 1fr)`;

    for(let i=0;i<N*N;i++){
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.slotIndex = String(i);
      boardEl.appendChild(slot);
    }

    // pieces (shuffled)
    trayEl.innerHTML = "";
    trayEl.style.gridTemplateColumns = `repeat(${Math.min(4, N)}, 1fr)`;

    const idxs = Array.from({length:N*N}, (_,i)=> i);
    shuffle(idxs);

    idxs.forEach(idx=>{
      const r = Math.floor(idx / N);
      const c = idx % N;

      const {id, svg} = pieceSVG(r,c);

      const wrap = document.createElement("div");
      wrap.className = "piece";
      wrap.dataset.pieceId = id;
      wrap.dataset.correctIndex = String(idx);
      wrap.innerHTML = svg;

      // drag handlers
      wrap.addEventListener("pointerdown", onPointerDown);

      trayEl.appendChild(wrap);
    });

    hideReveal();
  }

  function onPointerDown(e){
    const el = e.currentTarget;

    // if locked piece (correctly placed), do nothing
    if(el.dataset.locked === "1") return;

    e.preventDefault();
    el.setPointerCapture(e.pointerId);

    const originParent = el.parentElement;
    const originNextSibling = el.nextSibling;

    dragging = { el, originParent, originNextSibling, pointerId: e.pointerId };

    // move to drag layer as floating element
    const rect = el.getBoundingClientRect();
    el.classList.add("dragging");
    dragLayer.appendChild(el);

    // set initial position to center under pointer
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
    el.style.left = `${e.clientX}px`;
    el.style.top  = `${e.clientY}px`;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once:true });

    // highlight hover slot immediately
    updateHoverSlot(e.clientX, e.clientY);
  }

  function onPointerMove(e){
    if(!dragging) return;
    if(e.pointerId !== dragging.pointerId) return;

    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;

    dragging.el.style.left = `${e.clientX}px`;
    dragging.el.style.top  = `${e.clientY}px`;

    updateHoverSlot(e.clientX, e.clientY);
  }

  function onPointerUp(e){
    window.removeEventListener("pointermove", onPointerMove);
    clearHoverSlots();

    if(!dragging) return;

    const el = dragging.el;

    // find nearest slot center
    const slots = [...boardEl.querySelectorAll(".slot")];
    const best = nearestSlot(slots, e.clientX, e.clientY);

    const SNAP_PX = 90; // bigger = easier snapping
    if(best && best.dist < SNAP_PX){
      // if occupied, swap back to tray
      const existing = best.slot.querySelector(".piece");
      if(existing){
        // return existing to tray
        existing.classList.remove("dragging");
        existing.style.left = "";
        existing.style.top = "";
        existing.dataset.locked = "0";
        trayEl.prepend(existing);
        best.slot.classList.remove("filled");
      }

      // snap into slot
      el.classList.remove("dragging");
      el.style.left = "";
      el.style.top = "";
      best.slot.appendChild(el);
      best.slot.classList.add("filled");

      // lock if correct
      const correctIndex = el.dataset.correctIndex;
      if(correctIndex === best.slot.dataset.slotIndex){
        el.dataset.locked = "1";
      } else {
        el.dataset.locked = "0";
      }

      checkWin();
    } else {
      // return to tray (original place)
      el.classList.remove("dragging");
      el.style.left = "";
      el.style.top = "";
      trayEl.prepend(el);
    }

    dragging = null;
  }

  function nearestSlot(slots, x, y){
    let best = null;
    for(const slot of slots){
      const r = slot.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      const d = Math.hypot(cx - x, cy - y);
      if(!best || d < best.dist) best = { slot, dist: d };
    }
    return best;
  }

  function updateHoverSlot(x,y){
    const slots = [...boardEl.querySelectorAll(".slot")];
    const best = nearestSlot(slots, x, y);
    clearHoverSlots();
    if(best && best.dist < 110) best.slot.classList.add("hover");
  }

  function clearHoverSlots(){
    boardEl.querySelectorAll(".slot.hover").forEach(s=>s.classList.remove("hover"));
  }

  function checkWin(){
    const slots = [...boardEl.querySelectorAll(".slot")];
    const allFilled = slots.every(s => s.querySelector(".piece"));
    if(!allFilled) return;

    const allCorrect = slots.every(s => {
      const p = s.querySelector(".piece");
      return p && p.dataset.correctIndex === s.dataset.slotIndex && p.dataset.locked === "1";
    });

    if(allCorrect){
      heartConfetti();
      showReveal();
    }
  }

  function heartConfetti(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w/2;
    const cy = h/2;

    const hearts = ["💗","💖","💞","💓","💕","💘"];
    const count = 42;

    for(let i=0;i<count;i++){
      const d = document.createElement("div");
      d.className = "h";
      d.textContent = hearts[Math.floor(Math.random()*hearts.length)];

      const angle = Math.random()*Math.PI*2;
      const radius = 20 + Math.random()*100;
      const x = cx + Math.cos(angle)*radius;
      const y = cy + Math.sin(angle)*radius;

      d.style.left = `${x}px`;
      d.style.top  = `${y}px`;
      d.style.transform = `translate(-50%,-50%) rotate(${(Math.random()*50-25)}deg)`;

      confettiEl.appendChild(d);
      setTimeout(()=> d.remove(), 1500);
    }
  }

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function showReveal(){ revealEl.hidden = false; }
  function hideReveal(){ revealEl.hidden = true; }

  shuffleBtn.addEventListener("click", build);
  gridEl.addEventListener("change", build);

  againBtn.addEventListener("click", build);
  againBtn.addEventListener("touchend", (ev)=>{ ev.preventDefault(); build(); }, {passive:false});

  fileEl.addEventListener("change", (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { imgSrc = reader.result; previewImg.src = imgSrc; build(); };
    reader.readAsDataURL(file);
  });

  build();
});