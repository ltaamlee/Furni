import { useEffect } from "react";
import { IconX } from "./icons";

/**
 * Right-side slide-over panel (drawer), matching the .modal/.order-panel
 * pattern in the HTML mockups. Stays mounted so the open/close slide
 * animates. Closes on backdrop click or Escape.
 *
 * Props:
 *  open, onClose, title (node), headerRight (node), widthClass, children
 */
const SlideOver = ({ open, onClose, title, headerRight, widthClass = "sm:w-[560px]", children }) => {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose?.();
        if (open) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <div
            className={`fixed inset-0 bg-black/45 z-[200] flex items-start justify-end transition-opacity duration-200 ${
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={onClose}
        >
            <div
                className={`vendor-shell bg-white h-screen w-full ${widthClass} overflow-y-auto vendor-thin-scroll shadow-[-8px_0_32px_rgba(0,0,0,0.12)] transition-transform duration-[250ms] ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-[22px] py-4 border-b border-[#EDE8E0] sticky top-0 bg-white z-10">
                    <div className="min-w-0">{title}</div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {headerRight}
                        <button
                            onClick={onClose}
                            className="w-[30px] h-[30px] rounded-full bg-[#FAF7F4] text-[#6B5C4C] flex items-center justify-center transition-colors hover:bg-[#EDE8E0] hover:text-[#1C1108]"
                            aria-label="Đóng"
                        >
                            <IconX size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
                <div className="px-[22px] py-5">{children}</div>
            </div>
        </div>
    );
};

export default SlideOver;
