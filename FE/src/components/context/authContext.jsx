import { createContext, useState, useEffect } from "react";
import { getUserApi } from "../../utils/api";

export const AuthContext = createContext({
    isAuthenticated: false,
    user: {
        email: "",
        fullName: "",
        phone: "",
    },
    token: null,
    appLoading: true,
});

export const AuthWrapper = ({ children }) => {
    const [auth, setAuth] = useState({
        isAuthenticated: false,
        user: {
            email: "",
            fullName: "",
            phone: "",
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
                email: "",
                fullName: "",
                phone: "",
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
                        setAuth({
                            isAuthenticated: true,
                            user: {
                                email: response.data?.email || "",
                                fullName: response.data?.fullName || "",
                                phone: response.data?.phone || "",
                            }
                        });
                    } else {
                        // Token invalid or expired
                        logout();
                    }
                } catch (error) {
                    // Token invalid or network error
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
