import type { Model } from "../../lib/model";

export function DoorDetailView({
  model,
  width,
  height,
}: {
  model: Model;
  width: number;
  height: number;
}) {
  const door = model.doors[0];
  const design = model.design;
  const slidePx = door ? door.travel * design.doorOpen * door.slideDir * 34 : 0;
  const trim = `${design.aluminiumTrimSize} × ${design.doorTrimDepth} × ${design.doorTrimGauge} mm`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid meet"
      className="block"
      role="img"
      aria-label="Single sliding door and enlarged connection details"
    >
      <defs>
        <linearGradient id="detail-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bde9ef" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#36a56c" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1000" height="700" fill="#0b1411" fillOpacity="0.72" />
      <text x="28" y="34" fill="#8fd9ab" fontSize="13" letterSpacing="2.4" fontFamily="var(--font-mono)">SLIDING DOOR · SINGLE LEAF / CONNECTION STUDIES</text>

      <rect x="22" y="56" width="390" height="620" rx="10" fill="#111c18" stroke="#34443d" />
      <text x="44" y="88" fill="#dce9e1" fontSize="13" letterSpacing="1.4" fontFamily="var(--font-mono)">01 / COMPLETE LEAF</text>
      {door ? (
        <>
          <text x="44" y="111" fill="#8b9b92" fontSize="11" fontFamily="var(--font-mono)">{door.side.toUpperCase()} RUN · 1219 × 2438 mm · {design.doorOpen > 0.5 ? "SLIDING OPEN" : "CLOSED"}</text>
          <g transform={`translate(${slidePx}, 0)`}>
          <rect x="108" y="144" width="218" height="436" rx="2" fill="url(#detail-glass)" stroke="#8ad7e3" strokeOpacity="0.8" strokeWidth="2" />
          {Array.from({ length: 9 }).map((_, i) => {
            const x = 118 + (i * 198) / 8;
            return <line key={i} x1={x} y1="153" x2={x} y2="571" stroke="#d9f5fb" strokeOpacity="0.38" strokeWidth="1" />;
          })}
          <rect x="108" y="144" width="218" height="436" fill="none" stroke="#f1c877" strokeWidth="8" />
          <line x1="109" y1="362" x2="325" y2="362" stroke="#f1c877" strokeOpacity="0.65" strokeWidth="2" strokeDasharray="5 5" />
          </g>
          <path d="M 150 610 H 280 M 150 610 l 12 -7 M 150 610 l 12 7 M 280 610 l -12 -7 M 280 610 l -12 7" fill="none" stroke="#f1c877" strokeWidth="2" />
          <text x="215" y="634" fill="#f2d08a" fontSize="11" textAnchor="middle" fontFamily="var(--font-mono)">TRACKED SLIDE · {(door.travel * design.doorOpen * 1000).toFixed(0)} / {(door.travel * 1000).toFixed(0)} mm</text>
          <text x="215" y="655" fill="#819087" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">2 schematic floor carriages · 8 rollers total</text>
          <path d="M 326 150 L 362 128 H 394" fill="none" stroke="#f1c877" strokeWidth="1.2" />
          <text x="354" y="119" fill="#f2d08a" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">U-CHANNEL EDGE</text>
        </>
      ) : (
        <text x="217" y="350" fill="#f2d08a" fontSize="13" textAnchor="middle" fontFamily="var(--font-mono)">No door configured. Set a front or right leaf in Sliding doors.</text>
      )}

      <rect x="430" y="56" width="548" height="296" rx="10" fill="#111c18" stroke="#34443d" />
      <text x="452" y="88" fill="#dce9e1" fontSize="13" letterSpacing="1.4" fontFamily="var(--font-mono)">02 / RECESSED FLOOR CHANNEL · SCHEMATIC</text>
      <text x="452" y="111" fill="#8b9b92" fontSize="10" fontFamily="var(--font-mono)">FLOOR-LEVEL ROLLERS CARRY THE LEAF · NO OVERHEAD TROLLEY</text>
      <path d="M 558 144 H 854 V 250 H 558 Z" fill="#17231e" stroke="#49c2a7" strokeWidth="4" />
      <path d="M 592 165 V 229 H 820 V 165" fill="none" stroke="#6aa596" strokeWidth="3" strokeDasharray="7 5" />
      <rect x="620" y="204" width="46" height="26" rx="5" fill="#d69e49" stroke="#ffe0a0" strokeWidth="2" />
      <rect x="746" y="204" width="46" height="26" rx="5" fill="#d69e49" stroke="#ffe0a0" strokeWidth="2" />
      {[630, 656, 756, 782].map((x) => <circle key={x} cx={x} cy="224" r="10" fill="#dce4e8" stroke="#56635c" strokeWidth="3" />)}
      <path d="M 653 222 V 177 H 760 V 222" fill="none" stroke="#d69e49" strokeWidth="5" />
      <rect x="621" y="142" width="170" height="28" fill="#8ad7e3" fillOpacity="0.32" stroke="#f1c877" strokeWidth="4" />
      <text x="706" y="278" fill="#dce9e1" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">FLOOR WHEELS + VERTICAL CARRIERS SUPPORT THE LEAF</text>
      <text x="706" y="304" fill="#84958b" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">Illustrative arrangement only · channel depth, drainage, rollers and seal overlap require confirmation</text>

      <rect x="430" y="370" width="548" height="306" rx="10" fill="#111c18" stroke="#34443d" />
      <text x="452" y="402" fill="#dce9e1" fontSize="13" letterSpacing="1.4" fontFamily="var(--font-mono)">03 / SHS-TO-PURLIN JUNCTION</text>
      <text x="452" y="425" fill="#8b9b92" fontSize="10" fontFamily="var(--font-mono)">ROOF Z MEMBER BEARS AT RING / SHS POST · CONNECTION SHOWN SCHEMATICALLY</text>
      <rect x="530" y="460" width="86" height="174" fill="#647887" stroke="#c9d5e2" strokeWidth="3" />
      <path d="M 514 482 H 682 V 508 H 540 V 565 H 514 Z" fill="#246d60" stroke="#49c2a7" strokeWidth="3" />
      <path d="M 682 478 H 898 V 495 H 742 V 505 H 898 V 522 H 682 Z" fill="#9b6922" stroke="#e4a747" strokeWidth="3" />
      <rect x="608" y="473" width="27" height="43" fill="#9aa5a9" stroke="#dce4e8" strokeWidth="2" />
      <circle cx="621" cy="484" r="5" fill="#ed806c" stroke="#fff0e9" />
      <circle cx="621" cy="505" r="5" fill="#ed806c" stroke="#fff0e9" />
      <path d="M 616 483 H 590 M 616 505 H 590" stroke="#dce4e8" strokeWidth="3" />
      <path d="M 537 585 L 478 610 H 452" fill="none" stroke="#c9d5e2" strokeWidth="1.3" />
      <text x="452" y="625" fill="#c9d5e2" fontSize="10" fontFamily="var(--font-mono)">SHS POST</text>
      <path d="M 682 494 L 736 548 H 908" fill="none" stroke="#e4a747" strokeWidth="1.3" />
      <text x="908" y="565" fill="#e4a747" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">Z PURLIN</text>
      <path d="M 575 509 L 565 552 H 508" fill="none" stroke="#49c2a7" strokeWidth="1.3" />
      <text x="508" y="570" fill="#49c2a7" fontSize="10" fontFamily="var(--font-mono)">C RING / CLEAT</text>
      <text x="716" y="617" fill="#f2d08a" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">2 × BOLTS SHOWN · FINAL CLEAT / WELD / BOLT DESIGN BY ENGINEER</text>
      <text x="716" y="648" fill="#84958b" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">Door casing: {trim} aluminium U-channel · channel opening seats around the sheet edge</text>
    </svg>
  );
}
