const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const API_SERVER_URL = LOCAL_HOSTS.includes(window.location.hostname)
    ? '/hcgi/api'
    : "https://newsapi-xspv.onrender.com";

const apiServerClient = {
    fetch: async (url, options = {}) => {
        return await window.fetch(API_SERVER_URL + url, options);
    }
};

export default apiServerClient;

export { apiServerClient };
