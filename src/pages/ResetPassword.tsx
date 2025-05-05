import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import API from "@/lib/axios";
import { ApiResponse } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | null
  >(null);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Validate token exists
    if (!token) {
      setIsTokenValid(false);
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const checkPasswordStrength = (password: string) => {
    // Password strength validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    const isLongEnough = password.length >= 8;

    const passedChecks = [
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      isLongEnough,
    ].filter(Boolean).length;

    if (passedChecks <= 2) return "weak";
    if (passedChecks <= 4) return "medium";
    return "strong";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validateForm = () => {
    // Reset errors
    setError(null);

    // Validate password
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    // Password regex check - at least one uppercase, lowercase, number, and special character
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError(
        "Password must include uppercase, lowercase, number, and special character"
      );
      return false;
    }

    // Confirm passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!token) return;

    setIsLoading(true);

    try {
      const response = await API.post<ApiResponse>("/password/reset-password", {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data && response.data.message) {
        setIsSuccess(true);
        toast({
          title: "Password Reset Successful",
          description: response.data.message,
        });

        // Redirect to login after a delay
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to reset password";
      setError(errorMessage);

      // Handle token expired or invalid cases
      if (
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid")
      ) {
        setIsTokenValid(false);
      }

      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back button click to forgot password page
  const handleBack = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 relative">
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Forgot Password
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">
            Citizen Law Connect
          </h1>
          <p className="text-muted-foreground mt-2">Reset your password</p>
        </div>

        <Card className="border-border/40 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isSuccess ? "Password Reset Complete" : "Create New Password"}
            </CardTitle>
            <CardDescription className="text-center">
              {isSuccess
                ? "Your password has been successfully reset"
                : "Please enter your new password"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!isTokenValid ? (
              <div className="text-center space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    This password reset link is invalid or has expired. Please
                    request a new one.
                  </AlertDescription>
                </Alert>
                <Button asChild className="mt-4">
                  <Link to="/forgot-password">Request New Link</Link>
                </Button>
              </div>
            ) : isSuccess ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full inline-flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground">
                  Your password has been reset successfully. You will be
                  redirected to the login page shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  {passwordStrength && (
                    <div className="mt-1">
                      <div className="text-xs text-muted-foreground mb-1">
                        Password strength: {passwordStrength}
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            passwordStrength === "weak"
                              ? "w-1/3 bg-red-500"
                              : passwordStrength === "medium"
                              ? "w-2/3 bg-yellow-500"
                              : "w-full bg-green-500"
                          }`}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Password must contain at least 8 characters, including
                        uppercase, lowercase, number, and special character.
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Return to login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
