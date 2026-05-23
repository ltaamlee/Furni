import { Link } from "react-router-dom";

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${
          open ? "block" : "hidden"
        }`}
      />

      <aside
        className={`fixed lg:static z-50 w-64 bg-white border-r transform transition-transform
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="h-16 flex items-center justify-center bg-primary-700 text-white font-bold">
          NTSorature
        </div>

        <nav className="p-4 space-y-2 text-sm">
          <Link to="/admin">Tổng quan</Link>
          <Link to="/admin/employees">Nhân viên</Link>
          <Link to="/admin/customers">Khách hàng</Link>
          <Link to="/admin/categories">Danh mục</Link>
          <Link to="/admin/products">Sản phẩm</Link>
          <Link to="/admin/orders">Đơn hàng</Link>
          <Link to="/admin/profile">Hồ sơ</Link>
        </nav>
      </aside>
    </>
  );
}