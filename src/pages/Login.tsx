import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { syncProfile } from "../lib/profile";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        if (!isSupabaseConfigured || !supabase) {
            setErrorMessage(
                "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env file."
            );
            return;
        }

        if (!email || !password) {
            setErrorMessage("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setErrorMessage(error.message);
                return;
            }

            if (data.user) {
                const { error: profileError } = await syncProfile({ user: data.user });

                if (profileError) {
                    setErrorMessage(profileError);
                    return;
                }
            }

            navigate("/dashboard");
        } catch {
            setErrorMessage("Something went wrong while signing in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-flexBlack via-flexNavy to-flexBlue px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
                <section className="grid w-full overflow-hidden rounded-2xl bg-flexWhite/95 shadow-2xl ring-1 ring-flexBlack/15 md:grid-cols-2">
                    <div className="hidden bg-flexBlack p-10 text-flexWhite md:flex md:flex-col md:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-flexBlue">Flex Gym</p>
                            <h1 className="mt-4 text-4xl font-semibold leading-tight">
                                Welcome
                                <span className="block text-flexBlue">Back</span>
                            </h1>
                        </div>
                        <p className="max-w-xs text-sm leading-relaxed text-flexWhite/85">
                            Log in to continue your training plan, membership details, and dashboard.
                        </p>
                    </div>

                    <div className="p-6 sm:p-8 md:p-10">
                        <h2 className="text-2xl font-semibold text-flexBlack sm:text-3xl">Login</h2>
                        <p className="mt-2 text-sm text-flexNavy">Access your account with your credentials.</p>

                        {!isSupabaseConfigured ? (
                            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Missing Supabase setup. Create a <code>.env</code> file with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
                            </p>
                        ) : null}

                        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                            <label className="block text-sm font-medium text-flexBlack">
                                Email
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-flexNavy/35 bg-white px-3 py-2.5 text-flexBlack outline-none transition focus:border-flexBlue focus:ring-2 focus:ring-flexBlue/25"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </label>

                            <label className="block text-sm font-medium text-flexBlack">
                                Password
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-flexNavy/35 bg-white px-3 py-2.5 text-flexBlack outline-none transition focus:border-flexBlue focus:ring-2 focus:ring-flexBlue/25"
                                    placeholder="Your password"
                                    autoComplete="current-password"
                                />
                            </label>

                            {errorMessage ? (
                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {errorMessage}
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-flexBlue px-4 py-2.5 text-sm font-semibold text-flexWhite transition hover:bg-flexNavy disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? "Signing in..." : "Login"}
                            </button>
                        </form>

                        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-flexNavy">
                            <span>Don't have an account?</span>
                            <Link to="/register" className="font-semibold text-flexBlue hover:underline">
                                Go to Register
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}