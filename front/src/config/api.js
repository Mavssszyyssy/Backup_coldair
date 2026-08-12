const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "https://backend-deployment-ivory.vercel.app/api";

const API_FALLBACK_URL =
  process.env.REACT_APP_API_FALLBACK_URL ||
  "";

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  API_BASE_URL.includes("localhost")
) {
  console.warn(
    "Frontend is running in production but API_BASE_URL is still pointing to localhost. " +
    "Set REACT_APP_API_URL in Vercel to your deployed backend URL.",
  );
}

const getToken = () => localStorage.getItem("accessToken");
const getActiveBranch = () => localStorage.getItem("activeBranch");

const apiRequest = async (path, options = {}) => {
  const token = getToken();
  const activeBranch = getActiveBranch();
  const method = String(options.method || "GET").toUpperCase();
  const shouldDisableCache = method === "GET";
  const apiBaseUrls = [API_BASE_URL, API_FALLBACK_URL].filter(
    (value, index, values) => value && values.indexOf(value) === index,
  );
  const url = `${API_BASE_URL}${path}`;

  if (!token && !path.startsWith("/auth/")) {
    console.warn("Attempting API request without auth token", { url, path });
  }

  let response;
  let requestUrl = url;
  let lastNetworkError;
  try {
    for (const baseUrl of apiBaseUrls) {
      requestUrl = `${baseUrl}${path}`;
      try {
        response = await fetch(requestUrl, {
          ...options,
          ...(shouldDisableCache ? { cache: "no-store" } : {}),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(activeBranch ? { "X-Branch": activeBranch } : {}),
            ...(options.headers || {}),
          },
        });
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }
    if (!response) throw lastNetworkError || new Error("Network request failed.");
  } catch (error) {
    console.error("API request failed", { url: requestUrl, options, error });
    const message =
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("NetworkError")
        ? `Server unreachable at ${requestUrl}. Check backend is running and CORS is configured correctly.`
        : error?.message || "Network error occurred while sending the request.";
    const err = new Error(message);
    err.status = 0;
    err.data = null;
    throw err;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userRole");
      localStorage.removeItem("activeBranch");
      localStorage.removeItem("activeAccountSession");
      console.warn("Cleared stale auth state after 401.", { url: requestUrl, options });

      try {
        window.dispatchEvent(
          new CustomEvent("auth:logout", { detail: { reason: "401", url: requestUrl } }),
        );
      } catch (_error) {
        // ignore
      }
    }

    const message =
      data?.message ||
      (data?.errors && typeof data.errors === "object"
        ? Object.values(data.errors).join(" ")
        : "Request failed");
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    err.fieldErrors =
      data?.errors && typeof data.errors === "object" ? data.errors : null;
    throw err;
  }

  return data;
};

export { API_BASE_URL, apiRequest };
