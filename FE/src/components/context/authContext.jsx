import { createContext, useState, useEffect } from "react";
import { getUserApi } from "../../utils/api";

export const AuthContext = createContext({
    isAuthenticated: false,
    user: {
        id: "",
        email: "",
        fullName: "",
        phone: "",
        role: "",
        username: "",
        gender: "",
        dateOfBirth: "",
        avatar: "",
    },
    token: null,
    appLoading: true,
});

export const AuthWrapper = ({ children }) => {
    const [auth, setAuth] = useState({
        isAuthenticated: false,
        user: {
            id: "",
            email: "",
            fullName: "",
            phone: "",
            role: "",
            username: "",
            gender: "",
            dateOfBirth: "",
            avatar: "",
        }
    });

    const [appLoading, setAppLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem("access_token"));

    const logout = () => {
        localStorage.removeItem("access_token");
        setToken(null);
        setAuth({
            isAuthenticated: false,
            user: {
                id: "",
                email: "",
                fullName: "",
                phone: "",
                role: "",
                username: "",
                gender: "",
                dateOfBirth: "",
                avatar: "",
            }
        });
    };

    // Fetch user data when token is available
    useEffect(() => {
        const fetchUser = async () => {
            const storedToken = localStorage.getItem("access_token");
            if (storedToken) {
                setToken(storedToken);
                try {
                    const response = await getUserApi();
                    if (response && response.success) {
                        const userData = response.data.user;
                        setAuth({
                            isAuthenticated: true,
                            user: {
                                id: userData?.id,
                                email: userData?.email || "",
                                fullName: userData?.fullName || "",
                                phone: userData?.phone || "",
                                role: userData?.role || "",
                                username: userData?.username || "",
                                gender: userData?.gender || "",
                                dateOfBirth: userData?.dateOfBirth || "",
                                avatar: userData?.profileImage || userData?.avatar || "",
                            }
                        });
                    } else if (localStorage.getItem("capture_mode") === "true") {
                        // Bypass auth for Figma capture mode
                        setAuth({
                            isAuthenticated: true,
                            user: { id: "1", email: "demo@furni.com", fullName: "Demo User", phone: "0909123456", role: "customer", username: "demo", gender: "", dateOfBirth: "", avatar: "" }
                        });
                    } else {
                        logout();
                    }
                } catch (error) {
                    if (localStorage.getItem("capture_mode") === "true") {
                        setAuth({
                            isAuthenticated: true,
                            user: { id: "1", email: "demo@furni.com", fullName: "Demo User", phone: "0909123456", role: "customer", username: "demo", gender: "", dateOfBirth: "", avatar: "" }
                        });
                    } else {
                        logout();
                    }
                }
            }
            setAppLoading(false);
        };

        fetchUser();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                auth,
                setAuth,
                appLoading,
                setAppLoading,
                token,
                setToken,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
