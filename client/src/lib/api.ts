export const API_URL = 'http://localhost:5000';

export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'jwt_token': token } : {};
};

export const api = {
    get: async (endpoint: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json',
            },
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    post: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        // For login/register, sometimes we return just token, sometimes JSON
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || json.error || 'Request failed');
            return json;
        } else {
            const text = await res.text();
            if (!res.ok) throw new Error(text || 'Request failed');
            return text; // Should be handled
        }
    },

    postFormData: async (endpoint: string, formData: FormData) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(),
            },
            body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    put: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    delete: async (endpoint: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const json = await res.json();
                throw new Error(json.error || json.msg || 'Delete failed');
            }
            throw new Error(await res.text() || 'Delete failed');
        }
        return res.json();
    },
};
