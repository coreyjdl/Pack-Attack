import React, { useEffect, useRef, useState } from "react";

export function Lightbox({ src, onClose }: { src: string; onClose: () => void }): JSX.Element {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s * 1.25, 8));
      else if (e.key === "-" || e.key === "_") setScale((s) => Math.max(s / 1.25, 0.25));
      else if (e.key === "0") {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onWheel(e: React.WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setScale((s) => Math.min(Math.max(s * factor, 0.25), 8));
  }

  function onMouseDown(e: React.MouseEvent): void {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e: React.MouseEvent): void {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y)
    });
  }
  function endDrag(): void {
    dragRef.current = null;
  }

  function reset(): void {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div
      className="lightbox"
      onClick={onClose}
      onWheel={onWheel}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setScale((s) => Math.max(s / 1.25, 0.25))} title="Zoom out (-)">−</button>
        <span className="lightbox-zoom">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => setScale((s) => Math.min(s * 1.25, 8))} title="Zoom in (+)">+</button>
        <button type="button" onClick={reset} title="Reset (0)">Reset</button>
        <button type="button" onClick={onClose} title="Close (Esc)">Close</button>
      </div>
      <img
        src={src}
        alt=""
        className="lightbox-img"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          cursor: scale > 1 ? "grab" : "zoom-in"
        }}
        onClick={(e) => {
          e.stopPropagation();
          setScale((s) => (s === 1 ? 2 : 1));
          if (scale !== 1) setOffset({ x: 0, y: 0 });
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e);
        }}
        draggable={false}
      />
    </div>
  );
}
