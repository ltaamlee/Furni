import { Outlet } from "react-router-dom";
import Header from "./components/layout/header";
import axios from "./utils/axios.customize";
import { useContext, useEffect } from "react";
import { AuthContext } from "./components/context/authContext";

function App() {
    const { setAuth, appLoading, setAppLoading } = useContext(AuthContext);

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                setAppLoading(true);

                const res = await axios.get(`/user`);

                if (res && !res.message) {
                    setAuth({
                        isAuthenticated: true,
                        user: {
                            email: res.email,
                            name: res.name,
                        },
                    });
                }
            } catch (err) {
                console.log(err);
            } finally {
                setAppLoading(false);
            }
        };

        fetchAccount();
    }, []);

    return (
        <div>
            {appLoading ? (
                <div className="fixed inset-0 flex items-center justify-center bg-white/60">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    <Header />
                    <Outlet />
                </>
            )}
        </div>
    );
}

export default App;