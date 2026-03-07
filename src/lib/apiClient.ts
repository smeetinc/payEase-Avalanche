export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== "undefined" ? localStorage.getItem("payease_access_token") : null;

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorDetail = "API Error";
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
        } catch {
            // ignore parsing error
        }
        throw new Error(errorDetail);
    }

    return response.json();
}
