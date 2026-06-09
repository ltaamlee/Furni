import { useState } from "react";
import "../../components/vendor/vendor.css";
import { Label, Hint, Btn, inputClass } from "../../components/vendor/ui";
import {
    IconImage, IconUser, IconBox, IconDoc, IconCheck, IconChevronRight,
    IconChevronLeft, IconAlertCircle, IconClock, IconCalendar,
} from "../../components/vendor/icons";

const STEPS = [
    { n: 1, label: "Thông tin shop" },
    { n: 2, label: "Danh mục & mô tả" },
    { n: 3, label: "Xác minh hồ sơ" },
    { n: 4, label: "Hoàn tất" },
];

const CATEGORIES = ["Sofa", "Bàn", "Ghế", "Tủ kệ", "Giường", "Gương", "Phụ kiện", "Đèn"];

/* simple slugify matching the original mockup behaviour */
const slugify = (name) =>
    name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

/* ---- Steps indicator ---- */
const StepsBar = ({ current }) => (
    <div className="bg-white border-b border-[#EDE8E0] py-5">
        <div className="flex items-center justify-center max-w-[680px] mx-auto px-6">
            {STEPS.map((s, i) => {
                const done = s.n < current;
                const active = s.n === current;
                return (
                    <div key={s.n} className="flex items-center" style={{ flex: i === STEPS.length - 1 ? "none" : 1 }}>
                        <div className="flex items-center gap-2.5">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all shrink-0 ${
                                    done
                                        ? "bg-[#16a34a] border-[#16a34a] text-white"
                                        : active
                                        ? "bg-[#95520B] border-[#95520B] text-white"
                                        : "bg-white border-[#EDE8E0] text-[#9E8E7E]"
                                }`}
                            >
                                {done ? <IconCheck size={14} strokeWidth={3} /> : s.n}
                            </div>
                            <div
                                className={`text-[12.5px] whitespace-nowrap hidden sm:block ${
                                    active ? "text-[#1C1108] font-semibold" : done ? "text-[#16a34a] font-medium" : "text-[#9E8E7E] font-medium"
                                }`}
                            >
                                {s.label}
                            </div>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 min-w-[20px] transition-colors ${done ? "bg-[#16a34a]" : "bg-[#EDE8E0]"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

const CardHdr = ({ title, sub }) => (
    <div className="px-6 pt-[22px] pb-4 border-b border-[#EDE8E0] bg-gradient-to-br from-[#3a1d06] to-[#7B440C] text-white">
        <h2 className="text-[17px] font-extrabold mb-0.5">{title}</h2>
        <p className="text-[12.5px] opacity-80">{sub}</p>
    </div>
);

const SectionTitle = ({ icon, children }) => (
    <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#1C1108] mb-3 pt-1 after:content-[''] after:flex-1 after:h-px after:bg-[#EDE8E0]">
        {icon}
        {children}
    </div>
);

const Register = () => {
    const [step, setStep] = useState(1);
    const [shopName, setShopName] = useState("");
    const [slug, setSlug] = useState("");
    const [cats, setCats] = useState(["Sofa", "Ghế"]);
    const [bizType, setBizType] = useState("personal");

    const onName = (e) => {
        const v = e.target.value;
        setShopName(v);
        setSlug(slugify(v));
    };

    const toggleCat = (c) =>
        setCats((prev) => {
            if (prev.includes(c)) return prev.filter((x) => x !== c);
            if (prev.length >= 3) return prev;
            return [...prev, c];
        });

    const goStep = (n) => {
        setStep(n);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="vendor-shell min-h-screen bg-[#FAF7F4] flex flex-col">
            {/* Top nav */}
            <nav className="bg-white border-b border-[#EDE8E0] px-4 sm:px-8 h-[58px] flex items-center justify-between">
                <a href="/" className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] bg-[#95520B] rounded-lg flex items-center justify-center font-extrabold text-[15px] text-white">F</div>
                    <span className="font-bold text-base text-[#1C1108]">Furni</span>
                </a>
                <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#6B5C4C] hidden sm:inline">Đã có tài khoản?</span>
                    <Btn as="a" href="/login" variant="outline" size="sm">Đăng nhập</Btn>
                </div>
            </nav>

            <StepsBar current={step} />

            {/* Body */}
            <div className="flex-1 flex flex-col lg:flex-row gap-8 max-w-[900px] w-full mx-auto my-8 px-4 sm:px-6 items-start">
                {/* Form */}
                <div className="flex-1 min-w-0 w-full">
                    <div className="bg-white border border-[#EDE8E0] rounded-[14px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.09)]">

                        {/* STEP 1 */}
                        {step === 1 && (
                            <div className="vendor-fade-in">
                                <CardHdr title="Thông tin cơ bản về shop" sub="Điền thông tin để tạo trang shop của bạn trên Furni" />
                                <div className="px-6 py-[22px]">
                                    <SectionTitle icon={<IconImage size={14} />}>Hình ảnh shop</SectionTitle>
                                    <div className="grid grid-cols-[100px_1fr] gap-3.5 items-start mb-4">
                                        <div>
                                            <Label required className="text-xs">Logo</Label>
                                            <div className="w-[100px] h-[100px] border-2 border-dashed border-[#D5C9BC] rounded-[10px] bg-[#FAF7F4] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                                                <IconImage size={22} className="text-[#9E8E7E]" strokeWidth={1.5} />
                                                <span className="text-[10.5px] text-[#9E8E7E]">Logo shop</span>
                                            </div>
                                        </div>
                                        <div>
                                            <Label required className="text-xs">Banner</Label>
                                            <div className="h-[100px] border-2 border-dashed border-[#D5C9BC] rounded-[6px] bg-[#FAF7F4] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                                                <IconImage size={20} className="text-[#9E8E7E]" strokeWidth={1.5} />
                                                <span className="text-[11px] text-[#9E8E7E]">Ảnh banner (1200 × 300px)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <SectionTitle icon={<IconUser size={14} />}>Thông tin shop</SectionTitle>
                                    <div className="mb-3.5">
                                        <Label required>Tên shop</Label>
                                        <input className={inputClass} placeholder="VD: Nội Thất Đức Tâm" value={shopName} onChange={onName} />
                                    </div>
                                    <div className="mb-3.5">
                                        <Label required>Slug (đường dẫn shop)</Label>
                                        <div className="flex items-center border-[1.5px] border-[#EDE8E0] rounded-[6px] overflow-hidden bg-white focus-within:border-[#B86B05]">
                                            <span className="px-3 py-2 bg-[#FAF7F4] border-r border-[#EDE8E0] text-[12.5px] text-[#6B5C4C] whitespace-nowrap">furni.vn/shop/</span>
                                            <input
                                                className="border-none outline-none px-3 py-2 text-[13px] flex-1 min-w-0"
                                                placeholder="ten-shop-cua-ban"
                                                value={slug}
                                                onChange={(e) => setSlug(e.target.value)}
                                            />
                                        </div>
                                        <Hint>Chỉ dùng chữ thường, số và dấu gạch ngang</Hint>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                                        <div>
                                            <Label required>Số điện thoại</Label>
                                            <input className={inputClass} placeholder="0912 345 678" />
                                        </div>
                                        <div>
                                            <Label required>Email liên hệ</Label>
                                            <input className={inputClass} placeholder="shop@email.com" />
                                        </div>
                                    </div>
                                    <div className="mb-3.5">
                                        <Label required>Địa chỉ kho hàng</Label>
                                        <input className={inputClass} placeholder="Số nhà, tên đường, phường/xã" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <Label required>Tỉnh / Thành phố</Label>
                                            <select className={inputClass} defaultValue="">
                                                <option value="">Chọn tỉnh thành</option>
                                                <option>TP. Hồ Chí Minh</option><option>Hà Nội</option><option>Đà Nẵng</option>
                                                <option>Bình Dương</option><option>Đồng Nai</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label required>Quận / Huyện</Label>
                                            <select className={inputClass} defaultValue=""><option value="">Chọn quận huyện</option></select>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-3.5 border-t border-[#EDE8E0] bg-[#FAF7F4] flex items-center justify-between">
                                    <span className="text-[11.5px] text-[#9E8E7E]">Bước 1 / 3</span>
                                    <Btn variant="primary" onClick={() => goStep(2)}>Tiếp theo <IconChevronRight size={13} strokeWidth={2.5} /></Btn>
                                </div>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div className="vendor-fade-in">
                                <CardHdr title="Danh mục & mô tả shop" sub="Giúp khách hàng tìm thấy shop của bạn dễ dàng hơn" />
                                <div className="px-6 py-[22px]">
                                    <SectionTitle icon={<IconBox size={14} />}>Danh mục ngành hàng chính</SectionTitle>
                                    <Hint>Chọn 1–3 danh mục phù hợp nhất với shop của bạn</Hint>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 mb-5">
                                        {CATEGORIES.map((c) => {
                                            const selected = cats.includes(c);
                                            return (
                                                <button
                                                    key={c}
                                                    onClick={() => toggleCat(c)}
                                                    className={`border-2 rounded-[6px] px-2 py-2.5 text-center transition-colors ${
                                                        selected ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05] hover:bg-[#fffbeb]"
                                                    }`}
                                                >
                                                    <IconBox size={22} strokeWidth={1.8} className={`mx-auto mb-1.5 ${selected ? "text-[#B86B05]" : "text-[#9E8E7E]"}`} />
                                                    <span className={`text-[12px] font-medium ${selected ? "text-[#7B440C] font-bold" : "text-[#6B5C4C]"}`}>{c}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <SectionTitle icon={<IconDoc size={14} />}>Mô tả shop</SectionTitle>
                                    <div>
                                        <Label required>Mô tả ngắn</Label>
                                        <textarea rows={4} className={`${inputClass} resize-y`} placeholder="Giới thiệu về shop, chuyên môn, phong cách thiết kế, ưu điểm sản phẩm..." />
                                        <Hint>Tối thiểu 50 ký tự · Hiển thị trên trang shop</Hint>
                                    </div>
                                </div>
                                <div className="px-6 py-3.5 border-t border-[#EDE8E0] bg-[#FAF7F4] flex items-center justify-between">
                                    <Btn variant="ghost" onClick={() => goStep(1)}><IconChevronLeft size={13} strokeWidth={2.5} /> Quay lại</Btn>
                                    <Btn variant="primary" onClick={() => goStep(3)}>Tiếp theo <IconChevronRight size={13} strokeWidth={2.5} /></Btn>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <div className="vendor-fade-in">
                                <CardHdr title="Xác minh hồ sơ pháp lý" sub="Upload giấy tờ để Furni xác minh danh tính và cấp quyền bán hàng" />
                                <div className="px-6 py-[22px]">
                                    <SectionTitle icon={<IconUser size={14} />}>Cá nhân / Doanh nghiệp</SectionTitle>
                                    <div className="flex gap-2.5 mb-[18px]">
                                        {[
                                            { v: "personal", t: "Cá nhân", d: "Upload CCCD/CMND" },
                                            { v: "biz", t: "Doanh nghiệp", d: "Upload GPKD + CCCD đại diện" },
                                        ].map((o) => (
                                            <label
                                                key={o.v}
                                                className={`flex-1 border-2 rounded-[6px] px-3.5 py-3 cursor-pointer transition-colors flex items-center gap-2.5 ${
                                                    bizType === o.v ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05]"
                                                }`}
                                            >
                                                <input type="radio" name="bizType" value={o.v} checked={bizType === o.v} onChange={() => setBizType(o.v)} className="accent-[#95520B]" />
                                                <div>
                                                    <div className="text-[13px] font-semibold">{o.t}</div>
                                                    <div className="text-[11.5px] text-[#9E8E7E]">{o.d}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    <SectionTitle>Căn cước công dân / CMND</SectionTitle>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {["Mặt trước", "Mặt sau"].map((side) => (
                                            <div key={side}>
                                                <Label required className="text-xs">{side}</Label>
                                                <div className="border-2 border-dashed border-[#D5C9BC] rounded-[6px] p-[18px] text-center cursor-pointer bg-[#FAF7F4] transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                                                    <IconImage size={24} strokeWidth={1.5} className="text-[#9E8E7E] mx-auto mb-1.5" />
                                                    <div className="text-[12px] font-semibold">Tải ảnh {side.toLowerCase()}</div>
                                                    <div className="text-[11.5px] text-[#9E8E7E]">JPG, PNG ≤ 5MB</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {bizType === "biz" && (
                                        <div className="vendor-fade-in">
                                            <SectionTitle>Giấy phép kinh doanh</SectionTitle>
                                            <div className="border-2 border-dashed border-[#D5C9BC] rounded-[6px] p-[18px] text-center cursor-pointer bg-[#FAF7F4] mb-3.5 transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                                                <IconDoc size={24} strokeWidth={1.5} className="text-[#9E8E7E] mx-auto mb-1.5" />
                                                <div className="text-[12px] font-semibold">Tải GPKD lên</div>
                                                <div className="text-[11.5px] text-[#9E8E7E]">PDF, JPG, PNG ≤ 10MB</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[6px] border bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af] text-[12.5px]">
                                        <IconAlertCircle size={14} className="shrink-0 mt-0.5" />
                                        Thông tin và tài liệu của bạn được mã hoá và bảo mật. Chỉ dùng để xác minh danh tính.
                                    </div>
                                </div>
                                <div className="px-6 py-3.5 border-t border-[#EDE8E0] bg-[#FAF7F4] flex items-center justify-between">
                                    <Btn variant="ghost" onClick={() => goStep(2)}><IconChevronLeft size={13} strokeWidth={2.5} /> Quay lại</Btn>
                                    <Btn variant="primary" onClick={() => goStep(4)}>Gửi đăng ký <IconChevronRight size={13} strokeWidth={2.5} /></Btn>
                                </div>
                            </div>
                        )}

                        {/* STEP 4 – Success */}
                        {step === 4 && (
                            <div className="vendor-fade-in px-8 py-12 text-center">
                                <div className="w-[72px] h-[72px] bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <IconCheck size={34} strokeWidth={2.5} className="text-[#16a34a]" />
                                </div>
                                <h2 className="text-xl font-extrabold mb-2">Đăng ký thành công!</h2>
                                <p className="text-[#6B5C4C] text-sm max-w-[380px] mx-auto mb-5 leading-relaxed">
                                    Yêu cầu đăng ký của bạn đã được gửi. Admin Furni sẽ xem xét và phản hồi trong vòng{" "}
                                    <strong>1–3 ngày làm việc</strong>.
                                </p>
                                <div className="flex items-center gap-2.5 px-3.5 py-3 bg-[#fffbeb] border border-[#fde68a] rounded-[6px] text-[13px] text-[#78350f] max-w-[360px] mx-auto mb-6 text-left">
                                    <IconClock size={18} className="shrink-0" />
                                    <div>
                                        <div className="font-bold">Trạng thái: Đang chờ duyệt</div>
                                        <div className="text-[12px] mt-0.5">Mã hồ sơ: <strong>APP-2026-08421</strong></div>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 justify-center flex-wrap">
                                    <Btn as="a" href="/vendor/dashboard" variant="primary">Vào Dashboard</Btn>
                                    <Btn as="a" href="/" variant="outline">Về trang chủ</Btn>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar info */}
                <div className="w-full lg:w-[260px] lg:shrink-0 space-y-3.5">
                    <div className="bg-white border border-[#EDE8E0] rounded-[10px] p-[16px_18px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                        <div className="text-sm font-bold mb-3">Quy trình đăng ký</div>
                        {[
                            ["Điền thông tin shop", "Tên, địa chỉ, liên hệ"],
                            ["Chọn danh mục", "Ngành hàng và mô tả"],
                            ["Upload giấy tờ", "CCCD / GPKD xác minh"],
                            ["Chờ Admin duyệt", "1–3 ngày làm việc"],
                        ].map(([t, d], i) => (
                            <div key={t} className="flex gap-3 mb-3 last:mb-0">
                                <div className={`w-[26px] h-[26px] rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                    i + 1 <= step ? "bg-[#95520B] text-white" : "bg-[#EDE8E0] text-[#6B5C4C]"
                                }`}>
                                    {i + 1}
                                </div>
                                <div>
                                    <div className="text-[13px] font-semibold">{t}</div>
                                    <div className="text-[11.5px] text-[#9E8E7E]">{d}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white border border-[#EDE8E0] rounded-[10px] p-[16px_18px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                        <div className="text-[13px] font-bold mb-2.5">Lợi ích khi bán hàng</div>
                        <div className="flex flex-col gap-2">
                            {[
                                "Phí sàn chỉ 1.8% / đơn",
                                "Dashboard quản lý đầy đủ",
                                "Hỗ trợ vận chuyển GHN, GHTK",
                                "Giải ngân nhanh mỗi tuần",
                                "Công cụ Marketing miễn phí",
                            ].map((b) => (
                                <div key={b} className="flex gap-2 text-[12.5px]">
                                    <IconCheck size={15} strokeWidth={2.5} className="text-[#16a34a] shrink-0 mt-px" />
                                    {b}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#fffbeb] border border-[#B86B05] rounded-[10px] p-[16px_18px]">
                        <div className="text-[12.5px] text-[#7B440C] flex gap-2">
                            <IconCalendar size={15} className="shrink-0 mt-0.5" />
                            <div>
                                <strong>Hỗ trợ đăng ký:</strong><br />
                                Hotline: <strong>1800 6868</strong><br />
                                Email: vendor@furni.vn<br />
                                <span className="text-[11.5px] text-[#9E8E7E]">T2–T7 · 8:00–21:00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
