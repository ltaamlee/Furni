import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCartApi, updateCartItemApi, removeFromCartApi } from "../../utils/api";

const CartPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const res = await getCartApi();
            if (res.success) {
                setCart(res.data);
            }
        } catch (error) {
            console.error("Error fetching cart:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;
        try {
            setUpdating(productId);
            await updateCartItemApi(productId, newQuantity);
            await fetchCart();
        } catch (error) {
            alert(error.message || "Cập nhật thất bại");
        } finally {
            setUpdating(null);
        }
    };

    const handleRemoveItem = async (productId) => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        try {
            setUpdating(productId);
            await removeFromCartApi(productId);
            await fetchCart();
        } catch (error) {
            alert(error.message || "Xóa thất bại");
        } finally {
            setUpdating(null);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const products = cart?.products || [];
    const subtotal = cart?.totalPrice || 0;
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const total = subtotal + shippingFee;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">GIỎ HÀNG</h1>
                    <p className="text-gray-500 mt-2">Xem lại giỏ hàng của bạn và chỉnh sửa số lượng</p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">1</div>
                            <span className="font-medium text-green-600">Giỏ hàng</span>
                        </div>
                        <div className="w-16 h-0.5 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">2</div>
                            <span className="font-medium text-gray-500">Thông tin</span>
                        </div>
                        <div className="w-16 h-0.5 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">3</div>
                            <span className="font-medium text-gray-500">Thanh toán</span>
                        </div>
                        <div className="w-16 h-0.5 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">4</div>
                            <span className="font-medium text-gray-500">Xác nhận</span>
                        </div>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Giỏ hàng trống</h2>
                        <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
                        <Link to="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition">
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {products.map((item) => (
                                <div key={item.product._id || item.product} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
                                    <img
                                        src={item.image || "/placeholder.png"}
                                        alt={item.name}
                                        className="w-24 h-24 object-cover rounded-xl"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                        <p className="text-green-600 font-bold mt-1">{formatPrice(item.price)}</p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="flex items-center border rounded-full">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.product._id || item.product, item.quantity - 1)}
                                                    disabled={updating === (item.product._id || item.product) || item.quantity <= 1}
                                                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 disabled:opacity-50 rounded-l-full"
                                                >
                                                    -
                                                </button>
                                                <span className="w-12 text-center font-semibold">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.product._id || item.product, item.quantity + 1)}
                                                    disabled={updating === (item.product._id || item.product)}
                                                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 disabled:opacity-50 rounded-r-full"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.product._id || item.product)}
                                                disabled={updating === (item.product._id || item.product)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">{formatPrice(item.price * item.quantity)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">TÓM TẮT ĐƠN HÀNG</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tạm tính ({cart.totalQuantity} sản phẩm)</span>
                                        <span className="font-medium">{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Phí vận chuyển</span>
                                        <span className="font-medium">{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span>
                                    </div>
                                    {shippingFee > 0 && (
                                        <p className="text-xs text-green-600">Mua thêm {formatPrice(500000 - subtotal)} để được miễn phí ship!</p>
                                    )}
                                    <div className="border-t pt-3 flex justify-between">
                                        <span className="font-bold text-gray-800">Tổng cộng</span>
                                        <span className="font-bold text-xl text-green-600">{formatPrice(total)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate("/checkout")}
                                    className="w-full mt-6 bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
                                >
                                    TIẾP TỤC
                                </button>
                                <Link to="/" className="block text-center mt-3 text-gray-500 hover:text-green-600">
                                    ← Tiếp tục mua sắm
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
