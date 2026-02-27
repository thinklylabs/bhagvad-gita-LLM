"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase-browser";

function getTokensFromHash() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  return { access_token, refresh_token };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const supabase = getBrowserSupabase();
        const { access_token, refresh_token } = getTokensFromHash();

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
          window.history.replaceState({}, document.title, "/reset-password");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid or expired reset link";
        toast.error(message);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const updatePassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please sign in.");
      router.push("/auth");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
      <Card className="w-full max-w-md border-stone-800 bg-stone-900/70 text-stone-100">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription className="text-stone-400">
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-stone-700 bg-stone-950"
              placeholder="Minimum 6 characters"
              disabled={loading || initializing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-stone-700 bg-stone-950"
              placeholder="Re-enter password"
              disabled={loading || initializing}
            />
          </div>
          <Button
            className="w-full bg-amber-600 text-white hover:bg-amber-500"
            onClick={updatePassword}
            disabled={loading || initializing}
          >
            {initializing ? "Verifying link..." : loading ? "Updating..." : "Update password"}
          </Button>
          <Button asChild variant="ghost" className="w-full" disabled={loading}>
            <Link href="/auth">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
