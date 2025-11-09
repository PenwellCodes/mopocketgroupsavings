// axiosInstance.js
import axios from "axios";
import { API_URL } from "./config";
import { auth } from "@/config/firebase";

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor - Add Firebase ID token to requests
axiosInstance.interceptors.request.use(
  async (config) => {
    // Get Firebase ID token from current user
    if (auth.currentUser) {
      try {
        // Get fresh token (Firebase handles caching)
        const idToken = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
      } catch (error) {
        console.error("Error getting Firebase token:", error);
        // If token retrieval fails, try to get from sessionStorage as fallback
        const storedToken = JSON.parse(sessionStorage.getItem("accessToken") || "null");
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
      }
    } else {
      // Fallback to sessionStorage if no current user
      const storedToken = JSON.parse(sessionStorage.getItem("accessToken") || "null");
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
    }

    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor - Handle token expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        if (auth.currentUser) {
          const newToken = await auth.currentUser.getIdToken(true);
          sessionStorage.setItem("accessToken", JSON.stringify(newToken));
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        console.error("Token refresh failed:", refreshError);
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");
        window.location.href = "/auth";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

