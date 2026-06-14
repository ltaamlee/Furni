/**
 * Lightweight SVG donut chart (dependency-free).
 * Props: data: [{ label, value, color }], size?, gap?
 */
const DonutChart = ({ data = [], size = 160, gap = 1.5 }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const thickness = size * 0.2;
    const r = size / 2 - thickness / 2;
    const C = 2 * Math.PI * r;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                {data.map((d, i) => {
                    const len = (d.value / total) * C;
                    // start offset = sum of preceding segment lengths (no mutation during render)
                    const offset = (data.slice(0, i).reduce((s, x) => s + x.value, 0) / total) * C;
                    const dash = Math.max(len - gap, 0);
                    return (
                        <circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke={d.color}
                            strokeWidth={thickness}
                            strokeDasharray={`${dash} ${C - dash}`}
                            strokeDashoffset={-offset}
                        />
                    );
                })}
            </g>
        </svg>
    );
};

export default DonutChart;
