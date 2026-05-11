import React from "react";

const HomePage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-5">
            <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-md w-full">
                <h1 className="text-2xl font-bold text-gray-800">
                    Welcome to the Home Page!
                </h1>

                <p className="text-gray-500 mt-3">
                    This is the main page of the application. You can navigate to other pages from here.
                </p>
            </div>
        </div>
    );
};

export default HomePage;