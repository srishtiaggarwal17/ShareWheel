import { API_BASE_URL } from "../../config";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useUserContext } from "../../context/UserContext";
import { Button } from "../../components/ui/button";
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter,} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useToast } from "../../hooks/use-toast";
import { Car } from "lucide-react";

// Helper function to validate NITJ email
const isValidNITJEmail = (email) => {
  return email && email.toLowerCase().endsWith('@nitj.ac.in');
};

const Login = () => {
  const { login, setAuthError } = useUserContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);

    // Validate NITJ email domain
    if (!isValidNITJEmail(data.email)) {
      setAuthError("Only @nitj.ac.in email addresses are allowed");
      toast({
        title: "Login failed",
        description: "Please use your NITJ email address (@nitj.ac.in) to login.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();
      console.log("Login response:", responseData);

      if (res.ok && responseData.token && responseData.user) {
        const { _id, name, email} = responseData.user;

        const userData = {
          _id,
          name,
          email
        };

        localStorage.setItem('token', responseData.token);
        login(userData);
        toast({
          title: "Success",
          description: "You have been logged in successfully.",
        });
        navigate('/dashboard');
      } else {
        setAuthError("Invalid email or password");
        toast({
          title: "Login failed",
          description: responseData.message || "Invalid credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error", error);
      setAuthError("Something went wrong");
      toast({
        title: "Login failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 auth-container">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Car className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Enter your NITJ email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">NITJ Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="yourname@nitj.ac.in"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address",
                  },
                  validate: (value) => 
                    isValidNITJEmail(value) || "Only @nitj.ac.in email addresses are allowed"
                })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="********"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
