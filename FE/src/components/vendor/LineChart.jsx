import { useEffect, useRef, useState } from "react";
import { formatVND, formatVNDShort } from "./data";

/**
 * Lightweight, dependency-free SVG area/line chart.
 * Responsive (measures its container) so it doesn't distort strokes.
 *
 * Props: labels: string[], data: number[], height?: number
 */
const PAD = { top: 16, right: 14, bottom: 26, left: 46 };

const smoothPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`;
    }
    return d;
};

const LineChart = ({ labels = [], data = [], height = 220 }) => {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [hover, setHover] = useState(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            setWidth(entries[0].contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const innerW = Math.max(width - PAD.left - PAD.right, 0);
    const innerH = height - PAD.top - PAD.bottom;
    const n = data.length;

    const rawMax = Math.max(...data, 1);
    const step = Math.ceil(rawMax / 4 / 1_000_000) * 1_000_000 || 1_000_000;
    const niceMax = step * 4;

    const x = (i) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
    const y = (v) => PAD.top + innerH - (v / niceMax) * innerH;
    const pts = data.map((v, i) => [x(i), y(v)]);

    const linePath = smoothPath(pts);
    const areaPath = pts.length
        ? `${linePath} L ${pts[n - 1][0]} ${PAD.top + innerH} L ${pts[0][0]} ${PAD.top + innerH} Z`
        : "";

    const yTicks = [0, 1, 2, 3, 4].map((k) => k * step);

    return (
        <div ref={containerRef} className="relative w-full" style={{ height }}>
            {width > 0 && (
                <svg width={width} height={height} className="block">
                    <defs>
                        <linearGradient id="vendorRevFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(184,107,5,0.18)" />
                            <stop offset="100%" stopColor="rgba(184,107,5,0)" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal grid + y labels */}
                    {yTicks.map((t) => (
                        <g key={t}>
                            <line
                                x1={PAD.left} x2={width - PAD.right}
                                y1={y(t)} y2={y(t)}
                                stroke="rgba(0,0,0,0.05)" strokeWidth="1"
                            />
                            <text
                                x={PAD.left - 8} y={y(t) + 3}
                                textAnchor="end" fontSize="10" fill="#9E8E7E"
                            >
                                {formatVNDShort(t)}
                            </text>
                        </g>
                    ))}

                    {/* Area + line */}
                    <path d={areaPath} fill="url(#vendorRevFill)" />
                    <path d={linePath} fill="none" stroke="#B86B05" strokeWidth="2.5" strokeLinecap="round" />

                    {/* X labels */}
                    {labels.map((lb, i) => (
                        <text
                            key={i} x={x(i)} y={height - 8}
                            textAnchor="middle" fontSize="10" fill="#9E8E7E"
                        >
                            {labels.length > 12 && i % 3 !== 0 ? "" : lb}
                        </text>
                    ))}

                    {/* Points */}
                    {pts.map((p, i) => (
                        <circle
                            key={i} cx={p[0]} cy={p[1]}
                            r={hover === i ? 4.5 : 3}
                            fill="#B86B05" stroke="#fff" strokeWidth="1.5"
                        />
                    ))}

                    {/* Hover bands */}
                    {pts.map((p, i) => (
                        <rect
                            key={`hit-${i}`}
                            x={x(i) - innerW / (2 * Math.max(n - 1, 1))}
                            y={PAD.top}
                            width={innerW / Math.max(n - 1, 1)}
                            height={innerH}
                            fill="transparent"
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                        />
                    ))}
                </svg>
            )}

            {/* Tooltip */}
            {hover !== null && pts[hover] && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-[#1C1108] px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
                    style={{ left: pts[hover][0], top: pts[hover][1] - 8 }}
                >
                    <div className="text-[10px] font-normal text-white/60">{labels[hover]}</div>
                    {formatVND(data[hover])}
                </div>
            )}
        </div>
    );
};

export default LineChart;
