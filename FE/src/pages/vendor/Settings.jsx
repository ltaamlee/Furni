import { useState, useEffect, useCallback } from "react";
import { PageHeader, Btn, Label, Hint, Badge, inputClass } from "../../components/vendor/ui";
import { carriers as initialCarriers } from "../../components/vendor/data";
import { IconUser, IconMapPin, IconTruck, IconWallet, IconDoc, IconImage } from "../../components/vendor/icons";
import { useToast } from "../../components/context/ToastContext";
import { getMyShopApi, updateMyShopApi, uploadVendorImagesApi } from "../../utils/api";

const TABS = [
    { key: "basic", label: "Thông tin cơ bản", icon: IconUser },
    { key: "address", label: "Địa chỉ & Liên hệ", icon: IconMapPin },
    { key: "shipping", label: "Vận chuyển", icon: IconTruck },
    { key: "payment", label: "Thanh toán", icon: IconWallet },
    { key: "policy", label: "Chính sách", icon: IconDoc },
];

const SaveBar = ({ saveLabel = "Lưu thông tin", onSave, onCancel, saving }) => (
    <div className="sticky bottom-0 bg-white border-t border-[#EDE8E0] -mx-5 sm:-mx-7 -mb-6 mt-6 px-5 sm:px-7 py-3.5 flex items-center justify-end gap-2">
        <Btn variant="outline" onClick={onCancel}>Hủy thay đổi</Btn>
        <Btn variant="primary" onClick={onSave} disabled={saving}>{saving ? "Đang lưu..." : saveLabel}</Btn>
    </div>
);

const SectionHead = ({ title, sub }) => (
    <>
        <div className="text-base font-bold">{title}</div>
        <div className="text-[13px] text-[#6B5C4C] mb-5">{sub}</div>
    </>
);

/* ---- Tab: Basic info ---- */
const BasicSection = ({ shop, onSaved }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState({
        name: shop.name || "", slug: shop.slug || "", description: shop.description || "",
        logo: shop.logo || "", banner: shop.banner || "", isActive: shop.isActive !== false,
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState("");
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const initial = (form.name || "S").charAt(0).toUpperCase();

    const uploadImage = async (field, file) => {
        if (!file) return;
        try {
            setUploading(field);
            const res = await uploadVendorImagesApi([file]);
            if (res.success) set(field, res.data.images[0]);
            else showToast(Array.isArray(res.message) ? res.message.join(", ") : res.message || "Tải ảnh thất bại", "error");
        } catch { showToast("Lỗi tải ảnh", "error"); }
        finally { setUploading(""); }
    };

    const save = async () => {
        if (!form.name.trim()) return showToast("Vui lòng nhập tên shop", "error");
        try {
            setSaving(true);
            const res = await updateMyShopApi(form);
            if (res.success) { showToast("Đã lưu thông tin cửa hàng", "success"); onSaved(); }
            else showToast(res.message || "Lưu thất bại", "error");
        } catch { showToast("Có lỗi xảy ra", "error"); }
        finally { setSaving(false); }
    };

    return (
        <div className="vendor-fade-in">
            <SectionHead title="Thông tin cơ bản" sub="Thông tin hiển thị cho khách hàng trên trang shop của bạn" />

            <div className="flex flex-col sm:flex-row gap-5 items-start mb-5">
                <div>
                    <Label>Logo shop</Label>
                    <label className="w-20 h-20 rounded-[10px] bg-[#95520B] flex items-center justify-center text-white text-[28px] font-extrabold cursor-pointer overflow-hidden">
                        {form.logo ? <img src={form.logo} alt="" className="w-full h-full object-cover" /> : initial}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage("logo", e.target.files[0])} />
                    </label>
                    <div className="text-[11.5px] text-[#9E8E7E] mt-1.5 text-center">{uploading === "logo" ? "Đang tải..." : "PNG, JPG ≤ 2MB"}</div>
                </div>
                <div className="flex-1 w-full">
                    <Label>Banner shop</Label>
                    <label className="block w-full h-[100px] border-2 border-dashed border-[#D5C9BC] rounded-[6px] bg-[#FAF7F4] overflow-hidden flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb]">
                        {form.banner ? <img src={form.banner} alt="" className="w-full h-full object-cover" /> : (
                            <>
                                <IconImage size={22} className="text-[#9E8E7E]" strokeWidth={1.5} />
                                <span className="text-[12.5px] text-[#9E8E7E]">{uploading === "banner" ? "Đang tải..." : "Tải banner lên (1200×300px)"}</span>
                            </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage("banner", e.target.files[0])} />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label required>Tên shop</Label>
                    <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                    <Label>Slug (URL định danh)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[#9E8E7E]">/shop/</span>
                        <input className={`${inputClass} pl-[52px]`} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="mb-3.5">
                <Label>Mô tả shop</Label>
                <textarea rows={3} className={`${inputClass} resize-y`} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <Label>Trạng thái duyệt</Label>
                    <div className="pt-1"><Badge tone={shop.status === "approved" ? "green" : shop.status === "pending" ? "yellow" : "red"}>{shop.status === "approved" ? "Đã duyệt" : shop.status === "pending" ? "Chờ duyệt" : shop.status}</Badge></div>
                </div>
                <div>
                    <Label>Trạng thái bán hàng</Label>
                    <select className={inputClass} value={form.isActive ? "active" : "paused"} onChange={(e) => set("isActive", e.target.value === "active")}>
                        <option value="active">Đang hoạt động</option>
                        <option value="paused">Tạm nghỉ</option>
                    </select>
                </div>
            </div>

            <SaveBar onSave={save} onCancel={onSaved} saving={saving} />
        </div>
    );
};

/* ---- Tab: Address & contact ---- */
const AddressSection = ({ shop, onSaved }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState({ address: shop.address || "", phone: shop.phone || "", email: shop.email || "" });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const save = async () => {
        try {
            setSaving(true);
            const res = await updateMyShopApi(form);
            if (res.success) { showToast("Đã lưu địa chỉ & liên hệ", "success"); onSaved(); }
            else showToast(res.message || "Lưu thất bại", "error");
        } catch { showToast("Có lỗi xảy ra", "error"); }
        finally { setSaving(false); }
    };

    return (
        <div className="vendor-fade-in">
            <SectionHead title="Địa chỉ & Liên hệ" sub="Địa chỉ kho hàng và thông tin liên lạc" />
            <div className="mb-3.5">
                <Label required>Địa chỉ kho hàng</Label>
                <input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                <div>
                    <Label required>Số điện thoại liên hệ</Label>
                    <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div>
                    <Label required>Email liên hệ</Label>
                    <input className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
            </div>
            <SaveBar saveLabel="Lưu địa chỉ" onSave={save} onCancel={onSaved} saving={saving} />
        </div>
    );
};

/* ---- Tab: Shipping (chỉ GHN) ---- */
const GHN_FIELDS = ['token', 'shopId', 'fromDistrictId'];

const ShippingSection = ({ shop, onSaved }) => {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);

    const sp = shop?.shippingProviders || {};
    const [ghn, setGhn] = useState({
        token: sp.GHN?.token || "",
        shopId: sp.GHN?.shopId || "",
        fromDistrictId: sp.GHN?.fromDistrictId || "",
    });
    const [showToken, setShowToken] = useState(false);

    const setField = (field, val) => setGhn((p) => ({ ...p, [field]: val }));

    const save = async () => {
        try {
            setSaving(true);
            const payload = {
                shippingProviders: {
                    GHN: GHN_FIELDS.reduce((o, f) => { o[f] = ghn[f]; return o; }, {}),
                }
            };
            const res = await updateMyShopApi(payload);
            if (res.success) { showToast("Đã lưu cấu hình vận chuyển", "success"); onSaved?.(); }
            else showToast(res.message || "Lưu thất bại", "error");
        } catch { showToast("Có lỗi xảy ra", "error"); }
        finally { setSaving(false); }
    };

    return (
        <div className="vendor-fade-in">
            <SectionHead title="Cấu hình vận chuyển" sub="Kết nối API Giao Hàng Nhanh (GHN) — Furni sẽ dùng token của shop khi tạo đơn, fallback về token nền tảng nếu trống." />

            <div className="h-px bg-[#EDE8E0] my-5" />

            {/* GHN */}
            <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-[26px] bg-[#FAF7F4] rounded flex items-center justify-center text-[9px] font-bold text-[#6B5C4C] border border-[#EDE8E0]">GHN</div>
                    <div>
                        <div className="text-[13px] font-semibold">Giao Hàng Nhanh</div>
                        <div className="text-[11.5px] text-[#9E8E7E]">API Token, Shop ID & Quận gửi hàng mặc định</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                        <Label>API Token <span className="text-[#b91c1c]">*</span></Label>
                        <div className="relative">
                            <input type={showToken ? "text" : "password"} className={inputClass} placeholder="Token API GHN của shop" value={ghn.token} onChange={(e) => setField("token", e.target.value)} />
                            <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E8E7E] hover:text-[#6B5C4C] text-[11px]">{showToken ? "Ẩn" : "Hiện"}</button>
                        </div>
                        <Hint>Lấy tại trang cài đặt API của GHN</Hint>
                    </div>
                    <div>
                        <Label>Shop ID</Label>
                        <input className={inputClass} placeholder="VD: 23731" value={ghn.shopId} onChange={(e) => setField("shopId", e.target.value)} />
                    </div>
                    <div>
                        <Label>Mã quận gửi hàng</Label>
                        <input className={inputClass} placeholder="VD: 1441" value={ghn.fromDistrictId} onChange={(e) => setField("fromDistrictId", e.target.value)} />
                        <Hint>Quận kho hàng của bạn</Hint>
                    </div>
                </div>
            </div>

            <div className="h-px bg-[#EDE8E0] my-5" />

            <SaveBar saveLabel="Lưu cấu hình vận chuyển" onSave={save} onCancel={onSaved} saving={saving} />
        </div>
    );
};

/* ---- Tab: Payment (tĩnh, dùng ví ở trang Ví) ---- */
const PaymentSection = () => (
    <div className="vendor-fade-in">
        <SectionHead title="Thông tin thanh toán" sub="Tài khoản ngân hàng nhận tiền được quản lý ở trang Ví điện tử" />
        <div className="bg-[#FAF7F4] rounded-[6px] p-4 border border-[#EDE8E0] text-[13px] text-[#6B5C4C]">
            Vui lòng vào <strong>Ví điện tử → Rút tiền về ngân hàng</strong> để thêm/cập nhật tài khoản nhận tiền.
        </div>
    </div>
);

/* ---- Tab: Policy (tĩnh) ---- */
const PolicyEditor = ({ defaultValue }) => (
    <textarea rows={6} className="w-full p-3 border-[1.5px] border-[#EDE8E0] rounded-[6px] text-[13px] resize-y outline-none focus:border-[#B86B05]" defaultValue={defaultValue} />
);
const PolicySection = () => {
    const { showToast } = useToast();
    return (
        <div className="vendor-fade-in">
            <SectionHead title="Chính sách shop" sub="Chính sách đổi trả và bảo hành hiển thị trên trang sản phẩm" />
            <div className="mb-3.5">
                <Label>Chính sách đổi trả</Label>
                <PolicyEditor defaultValue={"• Đổi trả trong vòng 30 ngày kể từ ngày nhận hàng\n• Sản phẩm còn nguyên vẹn, chưa qua sử dụng\n• Lỗi do nhà sản xuất: đổi mới 100%"} />
            </div>
            <div>
                <Label>Chính sách bảo hành</Label>
                <PolicyEditor defaultValue={"• Bảo hành 12 tháng cho sản phẩm gỗ tự nhiên\n• Bảo hành 6 tháng cho sản phẩm gỗ công nghiệp"} />
            </div>
            <SaveBar saveLabel="Lưu chính sách" onSave={() => showToast("Đã lưu chính sách", "success")} onCancel={() => {}} />
        </div>
    );
};

const Settings = () => {
    const [active, setActive] = useState("basic");
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchShop = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getMyShopApi();
            if (res.success) setShop(res.data.shop);
        } catch { setShop(null); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchShop, 0);
        return () => clearTimeout(t);
    }, [fetchShop]);

    const renderSection = () => {
        if (active === "shipping") return <ShippingSection shop={shop} onSaved={fetchShop} />;
        if (active === "payment") return <PaymentSection />;
        if (active === "policy") return <PolicySection />;
        if (!shop) return null;
        if (active === "address") return <AddressSection shop={shop} onSaved={fetchShop} />;
        return <BasicSection shop={shop} onSaved={fetchShop} />;
    };

    return (
        <div className="vendor-fade-in">
            <PageHeader title="Cấu hình shop" sub={`Quản lý thông tin và cài đặt ${shop?.name || "cửa hàng"}`} />

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] bg-white border border-[#EDE8E0] rounded-[10px] overflow-hidden min-h-[calc(100vh-160px)]">
                <div className="border-b md:border-b-0 md:border-r border-[#EDE8E0] py-2">
                    <div className="text-[11px] font-bold text-[#9E8E7E] uppercase tracking-[0.06em] px-4 pt-2.5 pb-1.5">Cài đặt</div>
                    <div className="flex flex-row md:flex-col gap-0.5 p-2 overflow-x-auto vendor-no-scrollbar">
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const isActive = active === t.key;
                            return (
                                <button key={t.key} onClick={() => setActive(t.key)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13px] font-medium transition-colors text-left whitespace-nowrap ${isActive ? "bg-[#fef3c7] text-[#7B440C] font-semibold" : "text-[#6B5C4C] hover:bg-[#FAF7F4] hover:text-[#1C1108]"}`}>
                                    <Icon size={15} className={isActive ? "" : "opacity-70"} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 sm:px-7 py-6 overflow-y-auto">
                    {loading ? <div className="py-10 text-center text-[#9E8E7E] text-[13px]">Đang tải...</div> : renderSection()}
                </div>
            </div>
        </div>
    );
};

export default Settings;
