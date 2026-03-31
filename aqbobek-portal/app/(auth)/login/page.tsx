"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { BookOpen, GraduationCap, Shield, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/",
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль.");
      return;
    }

    window.location.href = result?.url ?? "/";
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#0F172A] p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute right-20 bottom-20 h-72 w-72 rounded-full bg-purple-500 blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500 text-4xl font-bold text-white"
            style={{ fontFamily: "Plus Jakarta Sans" }}
          >
            A
          </div>
          <h1
            className="mb-4 text-5xl leading-tight font-bold"
            style={{ fontFamily: "Plus Jakarta Sans" }}
          >
            Aqbobek
            <br />
            Lyceum
          </h1>
          <p className="mx-auto mb-12 max-w-sm text-center text-lg text-slate-400">
            Единый цифровой портал для учеников, учителей и родителей
          </p>
          <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-3">
            {[
              { icon: GraduationCap, label: "Ученики" },
              { icon: BookOpen, label: "Учителя" },
              { icon: Users, label: "Родители" },
              { icon: Shield, label: "Админ" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
              >
                <Icon className="h-4 w-4 text-blue-400" />
                <span className="text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-[var(--bg)] p-8">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Вход в цифровой портал Aqbobek</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Электронная почта</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@aqbobek.kz"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Демо: student@aqbobek.kz / student123
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
