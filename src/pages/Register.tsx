import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { syncProfile } from "../lib/profile";
import patternImage from "../assets/Pattern.png";
import spartanImage from "../assets/FlexBackgroundNoBg.png";

export default function Register() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        if (!firstName || !lastName || !email || !password) {
            setErrorMessage("Please complete all fields.");
            return;
        }

        if (!isSupabaseConfigured || !supabase) {
            setErrorMessage("Supabase is not configured. Please check your .env settings.");
            return;
        }

        try {
            setLoading(true);
            const full_name = `${firstName} ${lastName}`.trim();

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    },
                },
            });

            if (error) {
                setErrorMessage(error.message);
                return;
            }

            if (data.user) {
                const { error: profileError } = await syncProfile({
                    user: data.user,
                    full_name,
                });

                if (profileError) {
                    setErrorMessage(profileError);
                    return;
                }

                navigate("/subscription-tier");
                return;
            }
        } catch {
            setErrorMessage("Something went wrong while creating your account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-flexBlack via-flexNavy to-flexBlue px-4 py-8 sm:px-6 lg:px-8">
            <img
                src={patternImage}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 z-0 w-full max-w-none -translate-y-1/3 opacity-20"
            />
            <img
                src={patternImage}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 z-0 w-full max-w-none translate-y-1/3 opacity-20"
            />
            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
                <section className="grid w-full overflow-hidden rounded-2xl bg-flexWhite/95 shadow-2xl ring-1 ring-flexBlack/15 md:grid-cols-2">
                    <div className="relative hidden overflow-hidden bg-flexBlack p-10 text-flexWhite md:flex md:flex-col md:justify-between">
                        <img
                            src={spartanImage}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute left-[100%] top-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 object-contain opacity-8"
                        />
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-flexBlue">
                                Flex Republic
                            </p>
                            <h1 className="mt-4 text-4xl font-semibold leading-tight">
                                Build Your
                                <span className="block text-flexBlue">Fitness Routine</span>
                            </h1>
                        </div>
                        <p className="max-w-xs text-sm leading-relaxed text-flexWhite/85">
                            Sign up to manage your membership, track your sessions, and stay
                            connected with your gym dashboard.
                        </p>
                    </div>

                    <div className="p-6 sm:p-8 md:p-10">
                        <h2 className="text-2xl font-semibold text-flexBlack sm:text-3xl">
                            Create account
                        </h2>
                        <p className="mt-2 text-sm text-flexNavy">
                            Enter your details to start your gym membership.
                        </p>

                        {!isSupabaseConfigured ? (
                            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
                            </p>
                        ) : null}

                        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-flexBlack">
                                    First name
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(event) => setFirstName(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-flexNavy/35 bg-white px-3 py-2.5 text-flexBlack outline-none transition focus:border-flexBlue focus:ring-2 focus:ring-flexBlue/25"
                                        placeholder="John"
                                        autoComplete="given-name"
                                    />
                                </label>

                                <label className="block text-sm font-medium text-flexBlack">
                                    Last name
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(event) => setLastName(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-flexNavy/35 bg-white px-3 py-2.5 text-flexBlack outline-none transition focus:border-flexBlue focus:ring-2 focus:ring-flexBlue/25"
                                        placeholder="Doe"
                                        autoComplete="family-name"
                                    />
                                </label>
                            </div>

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
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
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
                                {loading ? "Creating account..." : "Create account"}
                            </button>
                        </form>

                        <p className="mt-5 text-center text-sm text-flexNavy">
                            Already have an account?{" "}
                            <Link to="/login" className="font-semibold text-flexBlue hover:underline">
                                Login here
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}