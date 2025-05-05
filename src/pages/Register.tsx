import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { registerCitizen, clearError } from "@/store/slices/authSlice";
import API from "@/lib/axios";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  // Store the previous location for back button
  const previousPath = location.state?.previousPath || "/";

  // Handle back button click
  const handleBack = () => {
    navigate(previousPath);
  };

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    languagePreference: "en",
    location: "",
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  // Email verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Add a new error state for detailed error messages
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    };

    // Check if at least one of email or phone is provided
    if (!formData.email && !formData.phoneNumber) {
      newErrors.email = "Either email or phone number is required";
      newErrors.phoneNumber = "Either email or phone number is required";
      isValid = false;
    }

    // Validate email if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Validate phone if provided
    if (
      formData.phoneNumber &&
      !/^\+?[\d\s-]{10,}$/.test(formData.phoneNumber)
    ) {
      newErrors.phoneNumber = "Please enter a valid phone number";
      isValid = false;
    }

    // Validate password
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    // Check email verification
    if (formData.email && !isEmailVerified) {
      newErrors.email = "Email must be verified";
      isValid = false;
    }

    setFormErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset email verification if email changes
    if (name === "email") {
      setIsEmailVerified(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Clear any previous errors
    dispatch(clearError());
    setRegistrationError(null);

    try {
      const resultAction = await dispatch(registerCitizen(formData));

      if (registerCitizen.fulfilled.match(resultAction)) {
        toast({
          title: "Registration Successful",
          description:
            "Your account has been created. Please login to continue.",
        });
        navigate("/login");
      } else if (registerCitizen.rejected.match(resultAction)) {
        // Handle the rejection payload
        const payload = resultAction.payload;
        let errorMessage = "Registration failed. Please try again.";

        // Direct payload can be a string or an object with message property
        if (typeof payload === "string") {
          errorMessage = payload;
        } else if (
          payload &&
          typeof payload === "object" &&
          "message" in payload
        ) {
          errorMessage = payload.message as string;
        } else if (resultAction.error && resultAction.error.message) {
          errorMessage = resultAction.error.message;
        }

        // Check for specific error messages
        if (
          errorMessage.toLowerCase().includes("citizen already exists") ||
          errorMessage.toLowerCase().includes("already registered") ||
          errorMessage.toLowerCase().includes("already exists")
        ) {
          errorMessage =
            "This email or phone number is already registered. Please log in or use a different contact method.";
        }

        // Set the detailed error message
        setRegistrationError(errorMessage);

        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: errorMessage,
        });
      }
    } catch (err: any) {
      // Fallback error handling
      const errorMessage = err.message || "An unexpected error occurred";
      setRegistrationError(errorMessage);

      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
    }
  };

  const handleSendVerification = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
      return;
    }

    try {
      setVerificationLoading(true);
      setVerificationError("");

      const response = await API.post("/mail/send", { email: formData.email });

      if (response.data && response.data.message) {
        // Check if the email is already verified
        if (response.data.message.includes("already verified")) {
          setIsEmailVerified(true);
          toast({
            title: "Email Already Verified",
            description: "This email has already been verified.",
          });
        } else {
          toast({
            title: "Verification Email Sent",
            description: response.data.message,
          });
          setShowOtpModal(true);
        }
      }
    } catch (err: any) {
      // Check if this is the "already verified" error
      if (err.response?.data?.message?.includes("already verified")) {
        setIsEmailVerified(true);
        toast({
          title: "Email Already Verified",
          description: "This email has already been verified.",
        });
      } else {
        setVerificationError(
          err.response?.data?.message || "Failed to send verification email"
        );
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description:
            err.response?.data?.message || "Failed to send verification email",
        });
      }
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Allow only one digit
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value !== "" && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Add a new handler for pasting OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const otpDigits = pastedData.split("");
      setOtp(otpDigits);

      // Focus the last input after pasting
      const lastInput = document.getElementById("otp-5");
      if (lastInput) lastInput.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setVerificationError("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationError("");

      const response = await API.post("/mail/confirm", {
        email: formData.email,
        otp: otpValue,
      });

      if (response.data && response.data.message === "Email verified.") {
        setIsEmailVerified(true);
        setShowOtpModal(false);
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified.",
        });
      } else {
        setVerificationError(response.data?.message || "Invalid OTP");
      }
    } catch (err: any) {
      setVerificationError(
        err.response?.data?.message || "Verification failed"
      );
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.response?.data?.message || "Failed to verify OTP",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
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
          Back
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">
            Citizen Law Connect
          </h1>
          <p className="text-muted-foreground mt-2">
            Create your citizen account
          </p>
        </div>

        <Card className="border-border/40 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Create Account
            </CardTitle>
            <CardDescription className="text-center">
              Fill in your details to create your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`${
                        isEmailVerified
                          ? "border-green-500 pr-10"
                          : formErrors.email
                          ? "border-red-500 pr-10"
                          : ""
                      }`}
                    />
                    {isEmailVerified && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={
                      !formData.email || verificationLoading || isEmailVerified
                    }
                    variant={isEmailVerified ? "outline" : "default"}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {isEmailVerified
                      ? "Verified ✓"
                      : verificationLoading
                      ? "Sending..."
                      : "Verify Email"}
                  </Button>
                </div>
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
                {formErrors.phoneNumber && (
                  <p className="text-sm text-destructive">
                    {formErrors.phoneNumber}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="languagePreference">Language Preference</Label>
                <Select
                  value={formData.languagePreference}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      languagePreference: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="rw">Kinyarwanda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Enter your location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {formErrors.password && (
                  <p className="text-sm text-destructive">
                    {formErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {formErrors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Display error messages prominently */}
              {(error || registrationError) && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className="font-medium">
                    {registrationError || error}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 border-t pt-4">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                state={{ previousPath: previousPath }}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Verification</DialogTitle>
            <DialogDescription>
              Please enter the 6-digit OTP sent to {formData.email}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-4 py-4">
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  maxLength={1}
                  className="w-12 h-12 text-center text-lg"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {verificationError && (
              <Alert variant="destructive">
                <AlertDescription>{verificationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowOtpModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleVerifyOtp}
                disabled={isVerifying || otp.join("").length !== 6}
              >
                {isVerifying ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={handleSendVerification}
                disabled={verificationLoading}
              >
                {verificationLoading ? "Sending..." : "Resend OTP"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
