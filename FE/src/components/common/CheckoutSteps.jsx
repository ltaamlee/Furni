const CheckoutSteps = ({ currentStep }) => {
    const steps = [
        { num: 1, label: "Giỏ hàng" },
        { num: 2, label: "Thông tin" },
        { num: 3, label: "Thanh toán" },
        { num: 4, label: "Xác nhận" }
    ];

    return (
        <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 md:gap-4">
                {steps.map((step, idx) => (
                    <div key={step.num} className="flex items-center">
                        {/* Step circle */}
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all
                                ${currentStep >= step.num 
                                    ? "bg-green-600 text-white shadow-lg" 
                                    : "bg-gray-200 text-gray-500"}`}>
                                {currentStep > step.num ? "✓" : step.num}
                            </div>
                            <span className={`text-sm font-medium hidden md:inline ${currentStep >= step.num ? "text-green-600" : "text-gray-400"}`}>
                                {step.label}
                            </span>
                        </div>
                        
                        {/* Connector line */}
                        {idx < steps.length - 1 && (
                            <div className={`w-8 md:w-16 h-0.5 mx-2 md:mx-3 ${currentStep > step.num ? "bg-green-600" : "bg-gray-200"}`}></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CheckoutSteps;
