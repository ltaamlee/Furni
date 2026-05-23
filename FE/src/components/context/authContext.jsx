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
                            }
                        });
                    } else {
                        logout();
                    }
                } catch (error) {
                    logout();
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
