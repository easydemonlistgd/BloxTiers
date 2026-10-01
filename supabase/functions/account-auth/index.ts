import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

const authClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

const siteUrl =
    "https://easydemonlistgd.github.io/BloxTiers";

function response(body: unknown, status = 200) {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            }
        }
    );
}

function validUsername(username: string) {
    return /^[A-Za-z0-9_]{3,20}$/.test(username);
}

async function findProfile(username: string) {
    const { data, error } = await adminClient
        .from("profiles")
        .select("id, username, recovery_email")
        .ilike("username", username)
        .maybeSingle();

    if (error) {
        console.error("Profile lookup failed:", error);
        throw new Error("Profile lookup failed.");
    }

    return data;
}

async function handleLogin(username: string, password: string) {
    if (!validUsername(username) || typeof password !== "string" || !password) {
        return response(
            { error: "Incorrect username or password." },
            401
        );
    }

    let profile;

    try {
        profile = await findProfile(username);
    } catch {
        return response(
            { error: "Login failed. Please try again." },
            500
        );
    }

    const email =
        profile?.recovery_email ||
        `${username.toLowerCase()}@accounts.blocktiers.local`;

    const { data, error } =
        await authClient.auth.signInWithPassword({
            email,
            password
        });

    if (error || !data.session) {
        return response(
            { error: "Incorrect username or password." },
            401
        );
    }

    return response({
        session: data.session
    });
}

async function handleForgotPassword(username: string) {
    if (!validUsername(username)) {
        return response({
            message:
                "If this account has a verified recovery email, a password reset link has been sent."
        });
    }

    try {
        const profile = await findProfile(username);
        const recoveryEmail = profile?.recovery_email;

        if (recoveryEmail) {
            const { error } =
                await authClient.auth.resetPasswordForEmail(
                    recoveryEmail,
                    {
                        redirectTo:
                            `${siteUrl}/reset-password.html`
                    }
                );

            if (error) {
                console.error(
                    "Password reset email failed:",
                    error
                );
            }
        }
    } catch (error) {
        console.error(
            "Password reset lookup failed:",
            error
        );
    }

    return response({
        message:
            "If this account has a verified recovery email, a password reset link has been sent."
    });
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders
        });
    }

    if (req.method !== "POST") {
        return response(
            { error: "Method not allowed." },
            405
        );
    }

    let body;

    try {
        body = await req.json();
    } catch {
        return response(
            { error: "Invalid request." },
            400
        );
    }

    const action = body?.action;

    if (action === "login") {
        return handleLogin(
            String(body?.username || "").trim(),
            String(body?.password || "")
        );
    }

    if (action === "forgot-password") {
        return handleForgotPassword(
            String(body?.username || "").trim()
        );
    }

    return response(
        { error: "Unknown action." },
        400
    );
});
