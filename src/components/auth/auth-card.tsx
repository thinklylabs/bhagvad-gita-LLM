"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type Mode = "signin" | "signup";
type View = "auth" | "forgot";

function getPasswordStrength(password: string): {
  score: number;
  label: "Very weak" | "Weak" | "Medium" | "Strong";
  colorClass: string;
} {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score, label: score === 0 ? "Very weak" : "Weak", colorClass: "bg-red-500" };
  }
  if (score <= 2) {
    return { score, label: "Medium", colorClass: "bg-amber-500" };
  }
  return { score, label: "Strong", colorClass: "bg-emerald-500" };
}

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [view, setView] = useState<View>("auth");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  const submit = async (nextMode: Mode) => {
    setLoading(true);

    try {
      const supabase = getBrowserSupabase();

      if (nextMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
              show_welcome_toast: true,
            },
          },
        });

        if (signUpError) throw signUpError;

        toast.success(
          "Account created. If email confirmation is enabled, verify your email and then sign in."
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        toast.success("Signed in successfully");
        const prompt = new URLSearchParams(window.location.search).get("prompt");
        router.push(
          prompt ? `/dashboard?prompt=${encodeURIComponent(prompt)}` : "/dashboard"
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async () => {
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth sign-in failed";
      toast.error(message);
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent");
      setView("auth");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
      <Card className="w-full max-w-md border-stone-800 bg-stone-900/70 text-stone-100">
        <CardHeader>
          <div className="mb-2 flex items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-sm shadow-sm">
              🕉
            </div>
          </div>
          <CardTitle>Welcome to Gita AI</CardTitle>
          <CardDescription className="text-stone-400">
            Sign in to access your conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === "forgot" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendPasswordReset();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-stone-700 bg-stone-950"
                  placeholder="you@example.com"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-600 text-white hover:bg-amber-500"
                disabled={loading || !email}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setView("auth")}
                disabled={loading}
              >
                Back to sign in
              </Button>
            </form>
          ) : (
            <>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-stone-700 bg-stone-950 hover:bg-stone-800"
                  onClick={handleOAuth}
                  disabled={loading}
                >
                  Continue with Google
                </Button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 top-1/2 h-px -translate-y-1/2 bg-stone-700" />
                <div className="relative mx-auto w-fit bg-stone-900/70 px-2 text-xs text-stone-400">
                  or continue with email
                </div>
              </div>

              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as Mode)}
                className="space-y-4"
              >
                <TabsList className="grid w-full grid-cols-2 bg-stone-800">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submit("signin");
                    }}
                  >
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-stone-700 bg-stone-950"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-stone-700 bg-stone-950 pr-10"
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                        onClick={() => setShowSignInPassword((v) => !v)}
                      >
                        {showSignInPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle password visibility</span>
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs text-stone-400 hover:text-stone-200"
                      onClick={() => setView("forgot")}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-amber-600 text-white hover:bg-amber-500"
                    disabled={loading || !email || !password}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submit("signup");
                    }}
                  >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-first-name">First name</Label>
                      <Input
                        id="signup-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="border-stone-700 bg-stone-950"
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-last-name">Last name</Label>
                      <Input
                        id="signup-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="border-stone-700 bg-stone-950"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-stone-700 bg-stone-950"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-stone-700 bg-stone-950 pr-10"
                        placeholder="Minimum 6 characters"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                        onClick={() => setShowSignUpPassword((v) => !v)}
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle password visibility</span>
                      </Button>
                    </div>
                    {password.length > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                          <div
                            className={`h-full transition-all ${passwordStrength.colorClass}`}
                            style={{ width: `${Math.max(passwordStrength.score, 1) * 25}%` }}
                          />
                        </div>
                        <p className="text-xs text-stone-400">
                          Password strength: {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-amber-600 text-white hover:bg-amber-500"
                    disabled={
                      loading ||
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !email ||
                      password.length < 6
                    }
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
