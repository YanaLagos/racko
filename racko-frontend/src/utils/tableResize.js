export function initResize(e) {
  e.preventDefault();
  e.stopPropagation();

  document.body.classList.add("resizing");

  const th = e.target.closest("th");
  if (!th) return;

  const tr = th.parentElement;
  const ths = Array.from(tr.children);
  const i = ths.indexOf(th);

  const nextTh = ths[i + 1];
  if (!nextTh) return;

  const startX = e.pageX;
  const startW1 = th.getBoundingClientRect().width;
  const startW2 = nextTh.getBoundingClientRect().width;

  const minW1 = parseFloat(getComputedStyle(th).minWidth) || 60;
  const minW2 = parseFloat(getComputedStyle(nextTh).minWidth) || 60;

  document.body.classList.add("resizing");

  const onMouseMove = (ev) => {
    const dx = ev.pageX - startX;

    let w1 = startW1 + dx;
    let w2 = startW2 - dx;

    // Respeta mínimos
    if (w1 < minW1) {
      const diff = minW1 - w1;
      w1 = minW1;
      w2 -= diff;
    }
    if (w2 < minW2) {
      const diff = minW2 - w2;
      w2 = minW2;
      w1 -= diff;
    }

    if (w1 < minW1 || w2 < minW2) return;

    th.style.width = `${w1}px`;
    nextTh.style.width = `${w2}px`;
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("blur", onMouseUp);
    document.body.classList.remove("resizing");
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  window.addEventListener("blur", onMouseUp);
}
