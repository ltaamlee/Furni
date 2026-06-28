/* ============================================================
   Vendor Portal – small reusable presentational primitives.
   Tailwind translations of the design tokens in the HTML mockups
   (shared.css). Colors use literal hex to match the mockup exactly
   and to avoid touching the global Tailwind theme.
   ============================================================ */
import { IconTrendUp, IconTrendDown, IconSearch } from "./icons";

const SHADOW = "shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]";

/* ---- Card ---- */
export const Card = ({ className = "", children }) => (
    <div className={`bg-white border border-[#EDE8E0] rounded-[10px] p-[18px_20px] ${SHADOW} ${className}`}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = "" }) => (
    <div className={`flex items-center justify-between gap-2.5 text-sm font-bold mb-3.5 ${className}`}>
        {children}
    </div>
);

/* ---- StatCard (dashboard KPI) ---- */
const STAT_ICON_BG = {
    amber: "bg-[#fef3c7] text-[#B86B05]",
    green: "bg-[#dcfce7] text-[#16a34a]",
    blue: "bg-[#dbeafe] text-[#2563eb]",
    rose: "bg-[#ffe4e6] text-[#e11d48]",
};

export const StatCard = ({ icon, label, value, accent, change, trend, color = "amber" }) => (
    <div className={`bg-white border border-[#EDE8E0] rounded-[10px] px-[18px] py-4 ${SHADOW}`}>
        <div className={`w-[38px] h-[38px] rounded-[6px] flex items-center justify-center mb-2.5 ${STAT_ICON_BG[color]}`}>
            {icon}
        </div>
        <div className="text-[11.5px] text-[#6B5C4C] font-medium uppercase tracking-[0.04em] mb-1">{label}</div>
        <div className={`text-[22px] font-bold mb-1 ${accent ? "text-[#B86B05]" : "text-[#1C1108]"}`}>{value}</div>
        {change && (
            <div className={`text-[11.5px] flex items-center gap-1 ${trend === "down" ? "text-[#dc2626]" : "text-[#16a34a]"}`}>
                {trend === "down" ? <IconTrendDown size={12} strokeWidth={2.5} /> : <IconTrendUp size={12} strokeWidth={2.5} />}
                {change}
            </div>
        )}
    </div>
);

/* ---- Badge ---- */
const BADGE_TONE = {
    green: "bg-[#dcfce7] text-[#15803d]",
    yellow: "bg-[#fef9c3] text-[#92400e]",
    red: "bg-[#fee2e2] text-[#b91c1c]",
    blue: "bg-[#dbeafe] text-[#1d4ed8]",
    orange: "bg-[#ffedd5] text-[#c2410c]",
    pink: "bg-[#FBE8EF] text-[#A84468]",
    ship: "bg-[#E8F8E3] text-[#2D8F00]",
    purple: "bg-[#ede9fe] text-[#6d28d9]",
    gray: "bg-[#FAF7F4] text-[#6B5C4C] border border-[#EDE8E0]",
};

export const Badge = ({ tone = "gray", children, className = "" }) => (
    <span className={`inline-flex items-center gap-1 px-[9px] py-[3px] rounded-full text-[11.5px] font-semibold ${BADGE_TONE[tone]} ${className}`}>
        {children}
    </span>
);

/* ---- Alert strip (dashboard warnings) ---- */
const ALERT_TONE = {
    warn: "bg-[#fffbeb] border-[#fde68a] text-[#78350f]",
    danger: "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]",
    info: "bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]",
};

export const AlertStrip = ({ tone = "warn", icon, children, className = "" }) => (
    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[6px] border text-[12.5px] ${ALERT_TONE[tone]} ${className}`}>
        {icon}
        <span>{children}</span>
    </div>
);

/* ---- Page header ---- */
export const PageHeader = ({ title, sub, actions }) => (
    <div className="flex items-start justify-between mb-5">
        <div>
            <div className="text-[19px] font-bold text-[#1C1108]">{title}</div>
            {sub && <div className="text-[12.5px] text-[#6B5C4C] mt-0.5">{sub}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
);

/* ---- Button ---- */
const BTN_VARIANT = {
    primary: "bg-[#95520B] text-white hover:bg-[#7B440C]",
    outline: "bg-transparent border-[1.5px] border-[#D5C9BC] text-[#6B5C4C] hover:border-[#B86B05] hover:text-[#B86B05]",
    ghost: "bg-transparent text-[#6B5C4C] border-[1.5px] border-transparent hover:bg-[#FAF7F4] hover:text-[#1C1108]",
    danger: "bg-[#dc2626] text-white hover:bg-[#b91c1c]",
    success: "bg-[#16a34a] text-white hover:brightness-95",
};
const BTN_SIZE = {
    md: "px-4 py-2 text-[13px]",
    sm: "px-[11px] py-[5px] text-[12px]",
    xs: "px-2 py-[3px] text-[11.5px]",
};

export const Btn = ({ as: Tag = "button", variant = "primary", size = "md", className = "", children, ...rest }) => (
    <Tag
        className={`inline-flex items-center justify-center gap-1.5 rounded-[6px] font-semibold cursor-pointer transition-colors duration-150 ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
        {...rest}
    >
        {children}
    </Tag>
);

/* ---- Form field helpers (label + control) ---- */
export const Label = ({ children, required, className = "" }) => (
    <label className={`block text-[12.5px] font-semibold text-[#1C1108] mb-1.5 ${className}`}>
        {children}
        {required && <span className="text-[#dc2626] ml-0.5">*</span>}
    </label>
);

export const inputClass =
    "w-full px-3 py-2 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[13px] text-[#1C1108] bg-white outline-none transition-colors focus:border-[#B86B05] placeholder:text-[#9E8E7E]";

export const Hint = ({ children }) => (
    <div className="text-[11.5px] text-[#9E8E7E] mt-1">{children}</div>
);

/* Filter <select> styling (matches .filter-select in the mockups) */
export const selectClass =
    "px-2.5 py-[7px] border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[13px] text-[#6B5C4C] bg-white outline-none cursor-pointer transition-colors focus:border-[#B86B05]";

/* ---- Search input (icon + field) ---- */
export const SearchInput = ({ placeholder = "Tìm kiếm...", className = "", ...rest }) => (
    <div className={`flex items-center border-[1.5px] border-[#EDE8E0] rounded-[6px] bg-white flex-1 min-w-[160px] max-w-[260px] focus-within:border-[#B86B05] ${className}`}>
        <input
            className="border-none outline-none px-3 py-[7px] text-[13px] bg-transparent flex-1 min-w-0 text-[#1C1108] placeholder:text-[#9E8E7E]"
            placeholder={placeholder}
            {...rest}
        />
        <IconSearch size={15} className="mr-2.5 text-[#9E8E7E] shrink-0" />
    </div>
);

/* ---- Tabs with count chips ---- */
export const Tabs = ({ tabs, active, onChange }) => (
    <div className="flex border-b-2 border-[#EDE8E0] mb-[18px] overflow-x-auto vendor-no-scrollbar">
        {tabs.map((t) => {
            const isActive = active === t.key;
            return (
                <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-0.5 whitespace-nowrap transition-colors ${
                        isActive ? "text-[#95520B] border-[#95520B] font-bold" : "text-[#6B5C4C] border-transparent hover:text-[#B86B05]"
                    }`}
                >
                    {t.label}
                    {t.count != null && (
                        <span
                            className={`ml-1 inline-flex items-center justify-center text-[10.5px] font-semibold px-1.5 py-px rounded-full border ${
                                t.chipClassName ||
                                (isActive ? "bg-[#95520B] text-white border-[#95520B]" : "bg-[#FAF7F4] text-[#6B5C4C] border-[#EDE8E0]")
                            }`}
                        >
                            {t.count}
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

/* ---- Toggle switch ---- */
export const Toggle = ({ on, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`w-[38px] h-[21px] rounded-full relative transition-colors shrink-0 ${on ? "bg-[#95520B]" : "bg-[#EDE8E0]"}`}
        aria-pressed={on}
    >
        <span className={`absolute top-0.5 w-[17px] h-[17px] bg-white rounded-full shadow transition-all ${on ? "left-[19px]" : "left-0.5"}`} />
    </button>
);

/* ---- Star rating (supports fractional, e.g. 4.7) ---- */
export const Stars = ({ value, size = 14 }) => (
    <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => {
            const fill = Math.max(0, Math.min(1, value - i));
            return (
                <span key={i} className="relative inline-block leading-none" style={{ fontSize: size, color: "#e2d9ce" }}>
                    ★
                    {fill > 0 && (
                        <span className="absolute left-0 top-0 overflow-hidden" style={{ width: `${fill * 100}%`, color: "#FBC309" }}>★</span>
                    )}
                </span>
            );
        })}
    </div>
);

/* ---- Pagination (compact) ---- */
export const Pagination = ({ pages = [1, 2, 3], current = 1, gap, total }) => (
    <div className="flex items-center justify-between mt-4">
        <span className="text-[11.5px] text-[#9E8E7E]">{total}</span>
        <div className="flex gap-1">
            <Btn variant="outline" size="xs">‹</Btn>
            {pages.map((p) => (
                <Btn key={p} variant={p === current ? "primary" : "outline"} size="xs">{p}</Btn>
            ))}
            {gap && <span className="px-1.5 py-[3px] text-[12px] text-[#9E8E7E]">...{gap}</span>}
            <Btn variant="outline" size="xs">›</Btn>
        </div>
    </div>
);
