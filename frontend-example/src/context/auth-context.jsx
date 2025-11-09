import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/config/firebase";
import axiosInstance from "@/api/axiosInstance";
import { API_URL } from "@/api/config";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signInFormData, setSignInFormData] = useState({
    userEmail: "",
    password: "",
  });
  const [signUpFormData, setSignUpFormData] = useState({
    userName: "",
    userEmail: "",
    phoneNumber: "",
    password: "",
    role: "user",
  });

  const navigate = useNavigate();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get ID token and fetch user data from backend
        try {
          const idToken = await firebaseUser.getIdToken();
          
          // Store token in sessionStorage
          sessionStorage.setItem("accessToken", JSON.stringify(idToken));
          
          // Fetch user data from backend
          const response = await axiosInstance.post("/auth/login", {
            idToken: idToken,
          });

          if (response.data.success) {
            setUser(response.data.data.user);
            sessionStorage.setItem("user", JSON.stringify(response.data.data.user));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // If backend call fails, sign out from Firebase
          await signOut(auth);
          sessionStorage.removeItem("accessToken");
          sessionStorage.removeItem("user");
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register new user
  const handleRegisterUser = async (e) => {
    e.preventDefault();

    try {
      const { userName, userEmail, password, phoneNumber, role } = signUpFormData;

      // Register user in backend (backend will create Firebase user and MongoDB user)
      const response = await axiosInstance.post("/auth/register", {
        userName,
        userEmail,
        password,
        phoneNumber,
        role: role || "user",
      });

      if (response.data.success) {
        // After backend creates Firebase user, sign in to get the token
        const userCredential = await signInWithEmailAndPassword(
          auth,
          userEmail,
          password
        );

        // Get Firebase ID token
        const idToken = await userCredential.user.getIdToken();

        // Store token and user data
        sessionStorage.setItem("accessToken", JSON.stringify(idToken));
        sessionStorage.setItem("user", JSON.stringify(response.data.data.user));
        setUser(response.data.data.user);

        // Navigate to home or dashboard
        navigate("/home");
      } else {
        throw new Error(response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already registered. Please login instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check your email.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
      throw error;
    }
  };

  // Login user
  const handleLoginUser = async (e) => {
    e.preventDefault();

    try {
      const { userEmail, password } = signInFormData;

      // Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userEmail,
        password
      );

      // Step 2: Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // Step 3: Verify token with backend and get user data
      const response = await axiosInstance.post("/auth/login", {
        idToken: idToken,
      });

      if (response.data.success) {
        // Store token and user data
        sessionStorage.setItem("accessToken", JSON.stringify(idToken));
        sessionStorage.setItem("user", JSON.stringify(response.data.data.user));
        setUser(response.data.data.user);

        // Navigate to home or dashboard
        navigate("/home");
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
      throw error;
    }
  };

  // Logout user
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("user");
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  // Forgot password
  const handleForgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || "http://localhost:5173/reset-password",
        handleCodeInApp: false,
      });
      return { success: true, message: "Password reset email sent!" };
    } catch (error) {
      console.error("Forgot password error:", error);
      
      let errorMessage = "Failed to send password reset email.";
      
      if (error.code === "auth/user-not-found") {
        // Don't reveal if user exists (security best practice)
        return { success: true, message: "If the email exists, a password reset link has been sent." };
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }
      
      return { success: false, message: errorMessage };
    }
  };

  // Refresh token (call this periodically or before API calls)
  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken(true); // Force refresh
        sessionStorage.setItem("accessToken", JSON.stringify(idToken));
        return idToken;
      } catch (error) {
        console.error("Token refresh error:", error);
        await handleLogout();
      }
    }
    return null;
  };

  const value = {
    user,
    loading,
    signInFormData,
    setSignInFormData,
    signUpFormData,
    setSignUpFormData,
    handleRegisterUser,
    handleLoginUser,
    handleLogout,
    handleForgotPassword,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };

