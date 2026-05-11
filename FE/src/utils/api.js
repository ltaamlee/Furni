import InputField from "../components/common/inputFields";
import axios from "./axios.customize";

const createUserApi = (name, email, assword) => {
    const URL_API = "/v1/api/register";
    const data = {
        name: name,
        email: email,
        password: assword,
    };
    return axios.post(URL_API, data);
}

const loginApi = (email, password) => {
    const URL_API = "/v1/api/login";
    const data = {
        email: email,
        password: password,
    };
    return axios.post(URL_API, data);
}

const getUserApi = () => {
    const URL_API = "/v1/api/user";
    return axios.get(URL_API);
}

export { createUserApi, loginApi, getUserApi };