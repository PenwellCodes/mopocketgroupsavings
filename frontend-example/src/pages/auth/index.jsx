import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommonForm from "@/components/common-form";
import { signInFormControls, signUpFormControls } from "@/config";
import { useAuth } from "@/context/auth-context";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";

function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin");
  const [loading, setLoading] = useState(true);

  const {
    signInFormData,
    setSignInFormData,
    signUpFormData,
    setSignUpFormData,
    handleRegisterUser,
    handleLoginUser,
  } = useAuth();

  function handleTabChange(value) {
    setActiveTab(value);
  }

  function checkIfSignInFormIsValid() {
    return (
      signInFormData?.userEmail !== "" && signInFormData?.password !== ""
    );
  }

  function checkIfSignUpFormIsValid() {
    return (
      signUpFormData?.userName !== "" &&
      signUpFormData?.userEmail !== "" &&
      signUpFormData?.phoneNumber !== "" &&
      signUpFormData?.password !== ""
    );
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-12 h-12 border-4 border-momoBlue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white shadow">
        <Link to="/home" className="flex items-center hover:text-momoBlue">
          <img
            src="/momobank.png"
            alt="Logo"
            className="h-15 w-20 mr-2"
          />
          <span className="font-extrabold md:text-xl text-[14px] text-momoBlue">Mo Pocket</span>
        </Link>
      </header>

      {/* Main Body */}
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-momoYellow px-4">
        <Tabs
          value={activeTab}
          defaultValue="signin"
          onValueChange={handleTabChange}
          className="w-full max-w-sm"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-gray-200 mb-4">
            <TabsTrigger
              value="signin"
              className="data-[state=active]:bg-momoBlue data-[state=active]:text-white rounded-full"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-momoBlue data-[state=active]:text-white rounded-full"
            >
              Signup
            </TabsTrigger>
          </TabsList>

          {/* Sign In Form */}
          <TabsContent value="signin">
            <Card className="p-6 space-y-4 bg-white rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-2xl font-bold text-momoBlue">Login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <CommonForm
                  formControls={signInFormControls}
                  buttonText={"Login"}
                  formData={signInFormData}
                  setFormData={setSignInFormData}
                  isButtonDisabled={!checkIfSignInFormIsValid()}
                  handleSubmit={handleLoginUser}
                />

                <div className="text-center text-sm mt-2">
                  Not a member?{" "}
                  <span
                    onClick={() => setActiveTab("signup")}
                    className="text-momoBlue hover:underline cursor-pointer"
                  >
                    Signup now
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sign Up Form */}
          <TabsContent value="signup">
            <Card className="p-6 space-y-4 bg-white rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-2xl font-bold text-momoBlue">Signup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <CommonForm
                  formControls={signUpFormControls}
                  buttonText={"Signup"}
                  formData={signUpFormData}
                  setFormData={setSignUpFormData}
                  isButtonDisabled={!checkIfSignUpFormIsValid()}
                  handleSubmit={handleRegisterUser}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AuthPage;

