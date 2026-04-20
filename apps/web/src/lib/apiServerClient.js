const API_SERVER_URL = window.location.hostname === 'localhost'
    ? '/hcgi/api'
    : "https://newsapi-xspv.onrender.com";

const apiServerClient = {
    fetch: async (url, options = {}) => {
        return await window.fetch(API_SERVER_URL + url, options);
    }
};

export default apiServerClient;

export { apiServerClient };
