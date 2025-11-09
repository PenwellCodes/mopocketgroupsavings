import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { toast } from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { initialSignInFormData, initialSignUpFormData } from "@/config";
import axiosInstance from "@/api/axiosInstance";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/config/firebase"; // Make sure this file exists

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [signInFormData, setSignInFormData] = useState(initialSignInFormData);
  const [signUpFormData, setSignUpFormData] = useState(initialSignUpFormData);
  const [authState, setAuthState] = useState({
    authenticate: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Store token in sessionStorage
          sessionStorage.setItem("accessToken", JSON.stringify(idToken));
          
          // Verify token with backend and get user data
          try {
            const response = await axiosInstance.post("/auth/login", {
              idToken: idToken,
            });

            if (response.data.success) {
              const userData = response.data.data.user;
              localStorage.setItem("userId", userData._id);
              setAuthState({
                authenticate: true,
                user: userData,
              });
            } else {
              // Backend verification failed, sign out from Firebase
              await signOut(auth);
              setAuthState({ authenticate: false, user: null });
              sessionStorage.removeItem("accessToken");
              localStorage.removeItem("userId");
            }
          } catch (error) {
            console.error("Backend auth check error:", error);
            // If backend is down or token invalid, sign out
            await signOut(auth);
            setAuthState({ authenticate: false, user: null });
            sessionStorage.removeItem("accessToken");
            localStorage.removeItem("userId");
          }
        } catch (error) {
          console.error("Firebase token error:", error);
          setAuthState({ authenticate: false, user: null });
        }
      } else {
        // User is signed out
        setAuthState({ authenticate: false, user: null });
        sessionStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ REGISTER USER
  async function handleRegisterUser(event) {
    event.preventDefault();

    try {
      // Step 1: Register user in backend (backend creates Firebase user and MongoDB user)
      const response = await axiosInstance.post("/auth/register", {
        ...signUpFormData,
        role: "user",
      });

      if (response.data.success) {
        // Step 2: After backend creates Firebase user, sign in to get the token
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            signUpFormData.userEmail,
            signUpFormData.password
          );

          // Step 3: Get Firebase ID token
          const idToken = await userCredential.user.getIdToken();

          // Step 4: Store token and user data
          sessionStorage.setItem("accessToken", JSON.stringify(idToken));
          localStorage.setItem("userId", response.data.data.user._id);
          setAuthState({
            authenticate: true,
            user: response.data.data.user,
          });

          toast.success("Registration successful!");
          
          // Navigate based on role
          if (response.data.data.user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/home");
          }
        } catch (firebaseError) {
          console.error("Firebase sign-in error after registration:", firebaseError);
          
          let errorMessage = "Registration successful but sign-in failed. Please login.";
          
          if (firebaseError.code === "auth/user-not-found") {
            errorMessage = "User created but not found. Please try logging in.";
          } else if (firebaseError.code === "auth/wrong-password") {
            errorMessage = "Registration successful but password issue. Please try logging in.";
          }
          
          toast.error(errorMessage);
          navigate("/auth");
        }
      } else {
        toast.error(response.data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = "Registration failed. Try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already registered. Please login instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check your email.";
      }
      
      toast.error(errorMessage);
    }
  }

  // ✅ LOGIN USER
  async function handleLoginUser(event) {
    event.preventDefault();

    try {
      // Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        signInFormData.userEmail,
        signInFormData.password
      );

      // Step 2: Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // Step 3: Verify token with backend and get user data
      const response = await axiosInstance.post("/auth/login", {
        idToken: idToken,
      });

      const data = response.data;
      console.log(data, "login response");

      if (data.success) {
        // Store token and user data
        sessionStorage.setItem("accessToken", JSON.stringify(idToken));
        localStorage.setItem("userId", data.data.user._id);
        setAuthState({
          authenticate: true,
          user: data.data.user,
        });

        toast.success("You have successfully logged in!");

        // Navigate based on role
        if (data.data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        setAuthState({ authenticate: false, user: null });
        const errorMessage =
          data?.message === "Invalid credentials"
            ? "Incorrect email or password"
            : data?.message || "Login failed. Please try again.";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.log(error);
      
      let errorMessage = "Login failed. Please try again.";
      
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
      }
      
      toast.error(errorMessage);
      setAuthState({ authenticate: false, user: null });
    }
  }

  // ✅ CHECK AUTH ON PAGE LOAD (now handled by Firebase auth state listener)
  async function checkAuthUser() {
    // This function is now handled by the Firebase onAuthStateChanged listener
    // But we keep it for backward compatibility if needed
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await axiosInstance.post("/auth/login", {
          idToken: idToken,
        });

        if (response.data.success) {
          setAuthState({
            authenticate: true,
            user: response.data.data.user,
          });
        } else {
          setAuthState({ authenticate: false, user: null });
        }
      } catch (error) {
        console.log(error);
        setAuthState({ authenticate: false, user: null });
      }
    } else {
      setAuthState({ authenticate: false, user: null });
    }
    setLoading(false);
  }

  // ✅ LOGOUT / RESET SESSION
  async function resetCredentials() {
    try {
      // Sign out from Firebase
      await signOut(auth);
      
      setAuthState({ authenticate: false, user: null });
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if Firebase sign out fails, clear local state
      setAuthState({ authenticate: false, user: null });
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      navigate("/auth");
    }
  }

  // ✅ FORGOT PASSWORD (optional - add if needed)
  async function handleForgotPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || "http://localhost:5173/reset-password",
        handleCodeInApp: false,
      });
      return { success: true, message: "Password reset email sent!" };
    } catch (error) {
      console.error("Forgot password error:", error);
      
      if (error.code === "auth/user-not-found") {
        // Don't reveal if user exists (security best practice)
        return { success: true, message: "If the email exists, a password reset link has been sent." };
      }
      
      return { success: false, message: "Failed to send password reset email." };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        signInFormData,
        setSignInFormData,
        signUpFormData,
        setSignUpFormData,
        handleRegisterUser,
        handleLoginUser,
        auth: authState, // Keep same structure for backward compatibility
        resetCredentials,
        handleForgotPassword, // Optional - add if you need forgot password
      }}
    >
      {loading ? <Skeleton /> : children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

