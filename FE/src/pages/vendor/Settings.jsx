import { useState } from "react";
import { PageHeader, Btn, Label, Hint, Badge, inputClass } from "../../components/vendor/ui";
import { shop, carriers as initialCarriers } from "../../components/vendor/data";
import {
    IconUser, IconMapPin, IconTruck, IconWallet, IconDoc, IconImage,
} from "../../components/vendor/icons";

const TABS = [
    { key: "basic", label: "Thông tin cơ bản", icon: IconUser },
    { key: "address", label: "Địa chỉ & Liên hệ", icon: IconMapPin },
    { key: "shipping", label: "Vận chuyển", icon: IconTruck },
    { key: "payment", label: "Thanh toán", icon: IconWallet },
    { key: "policy", label: "Chính sách", icon: IconDoc },
];

/* Sticky footer with Save/Cancel actions, spanning the content padding */
const SaveBar = ({ saveLabel = "Lưu thông tin", onCancel }) => (
    <div className="sticky bottom-0 bg-white border-t border-[#EDE8E0] -mx-5 sm:-mx-7 -mb-6 mt-6 px-5 sm:px-7 py-3.5 flex items-center justify-end gap-2">
        <Btn variant="outline" onClick={onCancel}>Hủy thay đổi</Btn>
        <Btn variant="primary">{saveLabel}</Btn>
    </div>
);

const SectionHead = ({ title, sub }) => (
    <>
        <div className="text-base font-bold">{title}</div>
        <div className="text-[13px] text-[#6B5C4C] mb-5">{sub}</div>
    </>
);

/* ---- Tab: Basic info ---- */
const BasicSection = () => (
    <div className="vendor-fade-in">
        <SectionHead title="Thông tin cơ bản" sub="Thông tin hiển thị cho khách hàng trên trang shop của bạn" />

        <div className="flex flex-col sm:flex-row gap-5 items-start mb-5">
            <div>
                <Label>Logo shop</Label>
                <div className="w-20 h-20 rounded-[10px] bg-[#95520B] flex items-center justify-center text-white text-[28px] font-extrabold cursor-pointer">
                    {shop.initial}
                </div>
                <div className="text-[11.5px] text-[#9E8E7E] mt-1.5 text-center">PNG, JPG<br />≤ 2MB</div>
            </div>
            <div className="flex-1 w-full">
                <Label>Banner shop</Label>
                <div className="w-full h-[100px] border-2 border-dashed border-[#D5C9BC] rounded-[6px] bg-[#FAF7F4] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                    <IconImage size={22} className="text-[#9E8E7E]" strokeWidth={1.5} />
                    <span className="text-[12.5px] text-[#9E8E7E]">Tải banner lên (1200×300px)</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            <div>
                <Label required>Tên shop</Label>
                <input className={inputClass} defaultValue={shop.name} />
            </div>
            <div>
                <Label required>Slug (URL định danh)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[#9E8E7E]">furni.vn/shop/</span>
                    <input className={`${inputClass} pl-[110px]`} defaultValue="noi-that-duc-tam" />
                </div>
            </div>
        </div>

        <div className="mb-3.5">
            <Label>Mô tả shop</Label>
            <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                defaultValue="Chuyên cung cấp nội thất gỗ tự nhiên cao cấp phong cách Scandinavian và Industrial. Sản phẩm được làm thủ công từ gỗ sồi, teak, óc chó nhập khẩu."
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <Label>Danh mục ngành hàng chính</Label>
                <select className={inputClass} defaultValue="Nội thất phòng khách">
                    <option>Nội thất phòng khách</option>
                    <option>Nội thất phòng ngủ</option>
                    <option>Nội thất văn phòng</option>
                    <option>Nội thất nhà bếp</option>
                </select>
            </div>
            <div>
                <Label>Trạng thái shop</Label>
                <select className={inputClass} defaultValue="Đang hoạt động">
                    <option>Đang hoạt động</option>
                    <option>Tạm nghỉ</option>
                    <option>Đóng cửa</option>
                </select>
            </div>
        </div>

        <SaveBar />
    </div>
);

/* ---- Tab: Address & contact ---- */
const AddressSection = () => (
    <div className="vendor-fade-in">
        <SectionHead title="Địa chỉ & Liên hệ" sub="Địa chỉ kho hàng và thông tin liên lạc" />

        <div className="mb-3.5">
            <Label required>Địa chỉ kho hàng</Label>
            <input className={inputClass} defaultValue="123 Nguyễn Văn Linh, Phường Tân Phong" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            <div>
                <Label>Tỉnh / Thành phố</Label>
                <select className={inputClass}><option>TP. Hồ Chí Minh</option><option>Hà Nội</option><option>Đà Nẵng</option></select>
            </div>
            <div>
                <Label>Quận / Huyện</Label>
                <select className={inputClass}><option>Quận 7</option><option>Quận 1</option><option>Bình Thạnh</option></select>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            <div>
                <Label required>Số điện thoại liên hệ</Label>
                <input className={inputClass} defaultValue="0912 345 678" />
            </div>
            <div>
                <Label required>Email liên hệ</Label>
                <input className={inputClass} defaultValue="contact@noithatductam.vn" />
            </div>
        </div>
        <div>
            <Label>Vị trí bản đồ (tuỳ chọn)</Label>
            <div className="h-[120px] bg-[#FAF7F4] border-[1.5px] border-[#EDE8E0] rounded-[6px] flex items-center justify-center text-[#9E8E7E] text-[13px] cursor-pointer gap-1.5">
                <IconMapPin size={16} />
                Nhấn để chọn vị trí trên bản đồ
            </div>
        </div>

        <SaveBar saveLabel="Lưu địa chỉ" />
    </div>
);

/* ---- Tab: Shipping ---- */
const ShippingSection = () => {
    const [carriers, setCarriers] = useState(initialCarriers);
    const toggle = (code) =>
        setCarriers((cs) => cs.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c)));

    return (
        <div className="vendor-fade-in">
            <SectionHead title="Cấu hình vận chuyển" sub="Đơn vị vận chuyển liên kết và phí mặc định" />

            <Label>Đơn vị vận chuyển liên kết</Label>
            <div className="space-y-2 mb-2">
                {carriers.map((c) => (
                    <label
                        key={c.code}
                        className={`flex items-center gap-2.5 px-3 py-2.5 border-[1.5px] rounded-[6px] cursor-pointer transition-colors ${
                            c.enabled ? "border-[#B86B05] bg-[#fffbeb]" : "border-[#EDE8E0] hover:border-[#B86B05] hover:bg-[#fffbeb]"
                        }`}
                    >
                        <div className="w-10 h-[26px] bg-[#FAF7F4] rounded flex items-center justify-center text-[9px] font-bold text-[#6B5C4C] border border-[#EDE8E0] shrink-0">
                            {c.code}
                        </div>
                        <div className="flex-1">
                            <div className="text-[13px] font-semibold">{c.name}</div>
                            <div className="text-[11.5px] text-[#9E8E7E]">{c.note}</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={c.enabled}
                            onChange={() => toggle(c.code)}
                            className="w-3.5 h-3.5 accent-[#95520B] cursor-pointer"
                        />
                    </label>
                ))}
            </div>

            <div className="h-px bg-[#EDE8E0] my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <Label>Phí ship mặc định (₫)</Label>
                    <input type="number" className={inputClass} defaultValue={30000} />
                    <Hint>Miễn phí ship từ đơn ≥ 500.000₫</Hint>
                </div>
                <div>
                    <Label>Thời gian xử lý đơn</Label>
                    <select className={inputClass} defaultValue="2 ngày làm việc">
                        <option>1 ngày làm việc</option>
                        <option>2 ngày làm việc</option>
                        <option>3 ngày làm việc</option>
                    </select>
                </div>
            </div>

            <SaveBar saveLabel="Lưu cài đặt" />
        </div>
    );
};

/* ---- Tab: Payment ---- */
const PaymentSection = () => (
    <div className="vendor-fade-in">
        <SectionHead title="Thông tin thanh toán" sub="Tài khoản ngân hàng nhận tiền từ đơn hàng" />

        <div className="bg-[#FAF7F4] rounded-[6px] p-4 mb-4 border border-[#EDE8E0]">
            <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold">Tài khoản chính</div>
                <Badge tone="green">Đã xác minh</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-[13px]">
                {[
                    ["Ngân hàng", "Vietcombank (VCB)"],
                    ["Số tài khoản", "****2345"],
                    ["Chủ tài khoản", "NGUYEN DUC TAM"],
                    ["Chi nhánh", "HCM - Quận 7"],
                ].map(([k, v]) => (
                    <div key={k}>
                        <div className="text-[11.5px] text-[#9E8E7E]">{k}</div>
                        <div className="font-semibold mt-0.5">{v}</div>
                    </div>
                ))}
            </div>
            <Btn variant="outline" size="sm" className="mt-2.5">Cập nhật tài khoản</Btn>
        </div>

        <div className="bg-[#FAF7F4] rounded-[6px] p-4 border border-[#EDE8E0]">
            <div className="text-[13px] font-bold mb-3">Ví điện tử liên kết</div>
            <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3.5 py-2 border-[1.5px] border-[#EDE8E0] rounded-[6px] bg-white">
                    <div className="w-6 h-6 bg-[#d32f2f] rounded-full flex items-center justify-center text-white text-[9px] font-bold">M</div>
                    <div className="text-[13px]">Momo</div>
                    <Badge tone="green" className="text-[10px]">Đã kết nối</Badge>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 border-[1.5px] border-dashed border-[#EDE8E0] rounded-[6px] bg-white cursor-pointer transition-colors hover:border-[#B86B05]">
                    <div className="w-6 h-6 bg-[#0068ff] rounded flex items-center justify-center text-white text-[9px] font-bold">ZP</div>
                    <div className="text-[13px]">ZaloPay</div>
                    <span className="text-[11px] text-[#9E8E7E]">Liên kết</span>
                </div>
            </div>
        </div>

        <SaveBar saveLabel="Lưu cài đặt" />
    </div>
);

/* ---- Tab: Policy ---- */
const PolicyEditor = ({ tools, defaultValue }) => (
    <>
        <div className="flex gap-1 px-2.5 py-2 bg-[#FAF7F4] border-[1.5px] border-[#EDE8E0] border-b-0 rounded-t-[6px] flex-wrap">
            {tools.map((t, i) => (
                <button key={i} className="px-2 py-1 border border-[#EDE8E0] bg-white rounded text-[12px] text-[#6B5C4C] transition-colors hover:border-[#B86B05] hover:text-[#B86B05]">
                    {t}
                </button>
            ))}
        </div>
        <textarea
            rows={6}
            className="w-full p-3 border-[1.5px] border-[#EDE8E0] border-t-0 rounded-b-[6px] text-[13px] resize-y outline-none focus:border-[#B86B05]"
            defaultValue={defaultValue}
        />
    </>
);

const PolicySection = () => (
    <div className="vendor-fade-in">
        <SectionHead title="Chính sách shop" sub="Chính sách đổi trả và bảo hành hiển thị trên trang sản phẩm" />

        <div className="mb-3.5">
            <Label>Chính sách đổi trả</Label>
            <PolicyEditor
                tools={["B", "I", "U", "H1", "H2", "— Dòng kẻ", "• Danh sách"]}
                defaultValue={`• Đổi trả trong vòng 30 ngày kể từ ngày nhận hàng
• Sản phẩm còn nguyên vẹn, chưa qua sử dụng
• Có đầy đủ phụ kiện và bao bì gốc
• Lỗi do nhà sản xuất: đổi mới 100%
• Chi phí vận chuyển đổi trả: shop chịu trong trường hợp lỗi SP`}
            />
        </div>

        <div>
            <Label>Chính sách bảo hành</Label>
            <PolicyEditor
                tools={["B", "I", "• Danh sách"]}
                defaultValue={`• Bảo hành 12 tháng cho tất cả sản phẩm gỗ tự nhiên
• Bảo hành 6 tháng cho sản phẩm gỗ công nghiệp
• Bảo hành miễn phí: lỗi do sản xuất, nứt vỡ tự nhiên
• Không bảo hành: hư hỏng do nước, trầy xước cơ học`}
            />
        </div>

        <SaveBar saveLabel="Lưu chính sách" />
    </div>
);

const SECTIONS = {
    basic: BasicSection,
    address: AddressSection,
    shipping: ShippingSection,
    payment: PaymentSection,
    policy: PolicySection,
};

const Settings = () => {
    const [active, setActive] = useState("basic");
    const ActiveSection = SECTIONS[active];

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Cấu hình shop" sub={`Quản lý thông tin và cài đặt ${shop.name}`} />

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] bg-white border border-[#EDE8E0] rounded-[10px] overflow-hidden min-h-[calc(100vh-160px)]">
                {/* Left tab nav */}
                <div className="border-b md:border-b-0 md:border-r border-[#EDE8E0] py-2">
                    <div className="text-[11px] font-bold text-[#9E8E7E] uppercase tracking-[0.06em] px-4 pt-2.5 pb-1.5">Cài đặt</div>
                    <div className="flex flex-row md:flex-col gap-0.5 p-2 overflow-x-auto vendor-no-scrollbar">
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const isActive = active === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setActive(t.key)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13px] font-medium transition-colors text-left whitespace-nowrap ${
                                        isActive
                                            ? "bg-[#fef3c7] text-[#7B440C] font-semibold"
                                            : "text-[#6B5C4C] hover:bg-[#FAF7F4] hover:text-[#1C1108]"
                                    }`}
                                >
                                    <Icon size={15} className={isActive ? "" : "opacity-70"} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right content */}
                <div className="px-5 sm:px-7 py-6 overflow-y-auto">
                    <ActiveSection />
                </div>
            </div>
        </div>
    );
};

export default Settings;
