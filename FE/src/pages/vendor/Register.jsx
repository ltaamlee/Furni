import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
// Đã sửa lại đường dẫn import AuthContext chuẩn xác
import { AuthContext } from "../../components/context/authContext"; 

import "../../components/vendor/vendor.css";
import { Label, Hint, Btn, inputClass } from "../../components/vendor/ui";
import {
    IconImage, IconUser, IconDoc, IconCheck, IconChevronRight,
    IconChevronLeft, IconClock, IconCalendar,
} from "../../components/vendor/icons";
import { registerShopApi, uploadShopImagesApi, getMyShopRegistrationApi, resubmitShopApi } from "../../utils/api";

const STEPS = [
    { n: 1, label: "Thông tin shop" },
    { n: 2, label: "Hình ảnh & mô tả" },
    { n: 3, label: "Hoàn tất" },
];

const slugify = (name) =>
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const StepsBar = ({ current }) => (
    <div className="bg-white border-b border-[#EDE8E0] py-5">
        <div className="flex items-center justify-center max-w-[680px] mx-auto px-6">
            {STEPS.map((s, i) => {
                const done = s.n < current;
                const active = s.n === current;
                return (
                    <div key={s.n} className="flex items-center" style={{ flex: i === STEPS.length - 1 ? "none" : 1 }}>
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all shrink-0 ${done ? "bg-[#16a34a] border-[#16a34a] text-white" : active ? "bg-[#95520B] border-[#95520B] text-white" : "bg-white border-[#EDE8E0] text-[#9E8E7E]"}`}>
                                {done ? <IconCheck size={14} strokeWidth={3} /> : s.n}
                            </div>
                            <div className={`text-[12.5px] whitespace-nowrap hidden sm:block ${active ? "text-[#1C1108] font-semibold" : done ? "text-[#16a34a] font-medium" : "text-[#9E8E7E] font-medium"}`}>{s.label}</div>
                        </div>
                        {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 min-w-[20px] transition-colors ${done ? "bg-[#16a34a]" : "bg-[#EDE8E0]"}`} />}
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
        {icon}{children}
    </div>
);

const Register = () => {
    const { auth } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isChecking, setIsChecking] = useState(true); 
    const [registrationStatus, setRegistrationStatus] = useState(null); 
    const [rejectReason, setRejectReason] = useState("");

    const [step, setStep] = useState(1);
    
    const [shopName, setShopName] = useState("");
    const [slug, setSlug] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [description, setDescription] = useState("");
    
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");
    
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!auth.isAuthenticated) return navigate("/login");
        if (auth.user?.role !== "customer") return navigate("/");

        const checkExisting = async () => {
            try {
                const res = await getMyShopRegistrationApi();
                
                // ĐÃ SỬA: Kiểm tra res.data thay vì res.data.data
                if (res && res.success && res.data) {
                    const shop = res.data; 
                    
                    if (shop.status === 'approved') {
                        navigate("/vendor/dashboard");
                    } else if (shop.status === 'pending') {
                        setShopName(shop.name);
                        setStep(3); // Đá thẳng sang bước 3
                    } else if (shop.status === 'rejected') {
                        setShopName(shop.name);
                        setSlug(shop.slug);
                        setPhone(shop.phone);
                        setEmail(shop.email);
                        setAddress(shop.address);
                        setDescription(shop.description);
                        setLogoPreview(shop.logo);     
                        setBannerPreview(shop.banner); 
                        
                        setRegistrationStatus('rejected');
                        setRejectReason(shop.statusNote || "Không có lý do cụ thể. Vui lòng kiểm tra lại thông tin.");
                    }
                }
            } catch (error) {
                console.error("Lỗi kiểm tra đơn đăng ký:", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkExisting();
    }, [auth, navigate]);

    const onName = (e) => {
        const v = e.target.value;
        setShopName(v);
        setSlug(slugify(v));
    };

    const goStep = (n) => {
        setErrorMsg("");
        setStep(n);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleImageChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);

        if (type === 'logo') {
            setLogoFile(file); 
            setLogoPreview(previewUrl);
        } else if (type === 'banner') {
            setBannerFile(file);
            setBannerPreview(previewUrl);
        }
    };

    const handleNextStep1 = () => {
        setErrorMsg("");
        if (!shopName.trim() || !slug.trim() || !phone.trim() || !email.trim() || !address.trim()) {
            setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc (*) ở Bước 1!");
            return;
        }
        goStep(2);
    };

    const handleSubmit = async () => {
        setErrorMsg("");

        if (!description.trim()) {
            setErrorMsg("Vui lòng nhập mô tả cho shop của bạn!");
            return;
        }
        
        if (!logoPreview || !bannerPreview) {
            setErrorMsg("Vui lòng tải lên đầy đủ Logo và Ảnh Banner cho shop!");
            return;
        }

        setLoading(true);
        try {
            let finalLogoUrl = logoPreview; 
            let finalBannerUrl = bannerPreview;

            const filesToUpload = [];
            if (logoFile) filesToUpload.push(logoFile);
            if (bannerFile) filesToUpload.push(bannerFile);

            if (filesToUpload.length > 0) {
                const uploadRes = await uploadShopImagesApi(filesToUpload);
                
                if (!uploadRes || !uploadRes.success) {
                    setErrorMsg(uploadRes?.message || "Lỗi khi tải ảnh lên, vui lòng thử lại!");
                    setLoading(false);
                    return;
                }

                let uploadIndex = 0;
                if (logoFile) {
                    finalLogoUrl = uploadRes.data.images[uploadIndex];
                    uploadIndex++;
                }
                if (bannerFile) {
                    finalBannerUrl = uploadRes.data.images[uploadIndex];
                }
            }

            const payload = {
                name: shopName,
                slug: slug,
                phone: phone,
                email: email,
                address: address,
                description: description,
                logo: finalLogoUrl,
                banner: finalBannerUrl
            };

            let response;
            if (registrationStatus === 'rejected') {
                response = await resubmitShopApi(payload);
            } else {
                response = await registerShopApi(payload);
            }

            if (response && response.success) {
                goStep(3);
            } else {
                setErrorMsg(response?.message || "Thao tác thất bại, vui lòng thử lại!");
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.message || "Có lỗi xảy ra khi kết nối với máy chủ!");
        } finally {
            setLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center text-[#9E8E7E] font-medium">
                <i className="las la-spinner la-spin text-3xl mr-3"></i> Đang kiểm tra trạng thái đăng ký...
            </div>
        );
    }

    return (
        <div className="vendor-shell min-h-screen bg-[#FAF7F4] flex flex-col">
            <nav className="bg-white border-b border-[#EDE8E0] px-4 sm:px-8 h-[58px] flex items-center justify-between">
                <a href="/" className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] bg-[#95520B] rounded-lg flex items-center justify-center font-extrabold text-[15px] text-white">F</div>
                    <span className="font-bold text-base text-[#1C1108]">Furni</span>
                </a>
            </nav>

            <StepsBar current={step} />

            <div className="flex-1 flex flex-col lg:flex-row gap-8 max-w-[900px] w-full mx-auto my-8 px-4 sm:px-6 items-start">
                <div className="flex-1 min-w-0 w-full">
                    <div className="bg-white border border-[#EDE8E0] rounded-[14px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.09)]">

                        {step === 1 && (
                            <div className="vendor-fade-in">
                                <CardHdr title={registrationStatus === 'rejected' ? "Cập nhật đơn đăng ký" : "Thông tin cơ bản về shop"} sub="Điền thông tin để tạo trang shop của bạn trên Furni" />
                                
                                {registrationStatus === 'rejected' && (
                                    <div className="mx-6 mt-6 p-4 bg-[#fef2f2] border border-[#fca5a5] rounded-[8px] flex items-start gap-3">
                                        <div className="mt-0.5 text-[#dc2626]">
                                            <IconDoc size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[#991b1b] font-bold text-[14px] mb-1">Đơn đăng ký trước đó của bạn đã bị từ chối!</h3>
                                            <p className="text-[#b91c1c] text-[13px] m-0 mb-1">
                                                <strong>Lý do từ Admin:</strong> {rejectReason}
                                            </p>
                                            <p className="text-[#b91c1c] text-[13px] m-0">
                                                Vui lòng chỉnh sửa lại các thông tin bên dưới và gửi lại đơn đăng ký.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="px-6 py-[22px]">
                                    
                                    {errorMsg && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md flex items-center gap-2">
                                            <IconDoc size={16} className="shrink-0" />
                                            {errorMsg}
                                        </div>
                                    )}

                                    <SectionTitle icon={<IconUser size={14} />}>Thông tin shop</SectionTitle>
                                    <div className="mb-3.5">
                                        <Label required>Tên shop</Label>
                                        <input className={inputClass} placeholder="VD: Nội Thất Đức Tâm" value={shopName} onChange={onName} />
                                    </div>
                                    <div className="mb-3.5">
                                        <Label required>Slug (đường dẫn shop)</Label>
                                        <div className="flex items-center border-[1.5px] border-[#EDE8E0] rounded-[6px] overflow-hidden bg-white focus-within:border-[#B86B05]">
                                            <span className="px-3 py-2 bg-[#FAF7F4] border-r border-[#EDE8E0] text-[12.5px] text-[#6B5C4C] whitespace-nowrap">furni.vn/shop/</span>
                                            <input className="border-none outline-none px-3 py-2 text-[13px] flex-1 min-w-0" placeholder="ten-shop-cua-ban" value={slug} onChange={(e) => setSlug(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                                        <div>
                                            <Label required>Số điện thoại</Label>
                                            <input className={inputClass} placeholder="0912 345 678" value={phone} onChange={e => setPhone(e.target.value)} />
                                        </div>
                                        <div>
                                            <Label required>Email liên hệ</Label>
                                            <input type="email" className={inputClass} placeholder="shop@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="mb-3.5">
                                        <Label required>Địa chỉ kho hàng</Label>
                                        <input className={inputClass} placeholder="Nhập đầy đủ số nhà, đường..." value={address} onChange={e => setAddress(e.target.value)} />
                                    </div>
                                </div>
                                <div className="px-6 py-3.5 border-t border-[#EDE8E0] bg-[#FAF7F4] flex items-center justify-between">
                                    <span className="text-[11.5px] text-[#9E8E7E]">Bước 1 / 2</span>
                                    <Btn variant="primary" onClick={handleNextStep1}>Tiếp theo <IconChevronRight size={13} strokeWidth={2.5} /></Btn>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="vendor-fade-in">
                                <CardHdr title="Hình ảnh & mô tả shop" sub="Giúp khách hàng nhận diện và hiểu rõ hơn về shop của bạn" />
                                <div className="px-6 py-[22px]">
                                    
                                    {errorMsg && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md flex items-center gap-2">
                                            <IconDoc size={16} className="shrink-0" />
                                            {errorMsg}
                                        </div>
                                    )}

                                    <SectionTitle icon={<IconImage size={14} />}>Hình ảnh shop</SectionTitle>
                                    <div className="grid grid-cols-[100px_1fr] gap-3.5 items-start mb-6">
                                        <div>
                                            <Label required className="text-xs">Logo</Label>
                                            <label className="w-[100px] h-[100px] border-2 border-dashed border-[#D5C9BC] rounded-[10px] bg-[#FAF7F4] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb] relative overflow-hidden group">
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'logo')} />
                                                {logoPreview ? (
                                                    <>
                                                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-white text-[11px] font-semibold">Đổi ảnh</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconImage size={22} className="text-[#9E8E7E]" strokeWidth={1.5} />
                                                        <span className="text-[10.5px] text-[#9E8E7E]">Logo shop</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        <div>
                                            <Label required className="text-xs">Banner</Label>
                                            <label className="h-[100px] border-2 border-dashed border-[#D5C9BC] rounded-[6px] bg-[#FAF7F4] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:border-[#B86B05] hover:bg-[#fffbeb] relative overflow-hidden group">
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'banner')} />
                                                {bannerPreview ? (
                                                    <>
                                                        <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-white text-[12px] font-semibold">Đổi banner</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconImage size={20} className="text-[#9E8E7E]" strokeWidth={1.5} />
                                                        <span className="text-[11px] text-[#9E8E7E]">Ảnh banner (1200 × 300px)</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <SectionTitle icon={<IconDoc size={14} />}>Mô tả shop</SectionTitle>
                                    <div>
                                        <Label required>Mô tả ngắn</Label>
                                        <textarea rows={4} className={`${inputClass} resize-y`} placeholder="Giới thiệu về shop..." value={description} onChange={e => setDescription(e.target.value)} />
                                    </div>
                                </div>
                                <div className="px-6 py-3.5 border-t border-[#EDE8E0] bg-[#FAF7F4] flex items-center justify-between">
                                    <Btn variant="ghost" onClick={() => goStep(1)} disabled={loading}><IconChevronLeft size={13} strokeWidth={2.5} /> Quay lại</Btn>
                                    <Btn variant="primary" onClick={handleSubmit} disabled={loading}>
                                        {loading ? "Đang xử lý..." : (registrationStatus === 'rejected' ? "Cập nhật & Gửi lại" : "Gửi đăng ký")} <IconChevronRight size={13} strokeWidth={2.5} />
                                    </Btn>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="vendor-fade-in px-8 py-12 text-center">
                                <div className="w-[72px] h-[72px] bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <IconCheck size={34} strokeWidth={2.5} className="text-[#16a34a]" />
                                </div>
                                <h2 className="text-xl font-extrabold mb-2">Đăng ký thành công!</h2>
                                <p className="text-[#6B5C4C] text-sm max-w-[380px] mx-auto mb-5 leading-relaxed">
                                    {registrationStatus === 'rejected' 
                                        ? "Đơn đăng ký của bạn đã được cập nhật và gửi lại thành công. Admin sẽ xem xét trong thời gian sớm nhất."
                                        : "Yêu cầu đăng ký của bạn đã được gửi. Admin Furni sẽ xem xét và phản hồi trong vòng 1–3 ngày làm việc."}
                                </p>
                                <div className="flex items-center gap-2.5 px-3.5 py-3 bg-[#fffbeb] border border-[#fde68a] rounded-[6px] text-[13px] text-[#78350f] max-w-[360px] mx-auto mb-6 text-left">
                                    <IconClock size={18} className="shrink-0" />
                                    <div>
                                        <div className="font-bold">Trạng thái: Đang chờ duyệt</div>
                                        <div className="text-[12px] mt-0.5">Shop: <strong>{shopName}</strong></div>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 justify-center flex-wrap">
                                    <Btn as="a" href="/" variant="primary">Về trang chủ</Btn>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full lg:w-[260px] lg:shrink-0 space-y-3.5 hidden lg:block">
                    <div className="bg-white border border-[#EDE8E0] rounded-[10px] p-[16px_18px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                        <div className="text-sm font-bold mb-3">Quy trình đăng ký</div>
                        {[
                            ["Điền thông tin shop", "Tên, địa chỉ, liên hệ"],
                            ["Tải ảnh & mô tả", "Logo, banner và giới thiệu"],
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
                        <div className="text-[13px] font-bold mb-2.5">Quy trình xử lý</div>
                        <div className="text-[12px] text-[#6B5C4C] leading-relaxed">
                            Mọi thông tin chỉnh sửa sẽ được Admin xem xét lại. Vui lòng đảm bảo tính chính xác của dữ liệu.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;