
(() => {
    const CONFIG_URL = window.BLOCKTIERS_SUPABASE_URL;
    const CONFIG_KEY = window.BLOCKTIERS_SUPABASE_ANON_KEY;

    if (!CONFIG_URL || !CONFIG_KEY || CONFIG_URL === "YOUR_SUPABASE_URL") {
        console.warn("BlockTiers: Supabase is not configured yet.");
        return;
    }

    const client = window.supabase.createClient(CONFIG_URL, CONFIG_KEY);
    window.blockTiersAuth = client;

    const byId = (id) => document.getElementById(id);

    const adminUsers = ["BlockTiersAdmin", "AnotherAdmin"];

    function renderUsername(element, displayName, username) {
        if (!element) return;

        if (adminUsers.includes(username)) {
            element.innerHTML = `${escapeHtml(displayName)} <span class="admin-badge">ADMIN</span>`;
        } else {
            element.textContent = displayName;
        }
    }

    function setMessage(id, message, type = "") {
        const el = byId(id);
        if (!el) return;

        el.textContent = message;
        el.className = `form-message ${type}`.trim();
    }

    function validUsername(username) {
        return /^[A-Za-z0-9_]{3,20}$/.test(username);
    }

    async function getProfile(user) {
        const { data, error } = await client
            .from("profiles")
            .select("id, username, display_name, created_at")
            .eq("id", user.id)
            .single();

        if (error) throw error;
        return data;
    }

    async function getActiveBan(userId) {
        const now = new Date().toISOString();

        const { data, error } = await client
            .from("user_bans")
            .select("id, reason, expires_at, created_at")
            .eq("user_id", userId)
            .is("revoked_at", null)
            .or(`expires_at.is.null,expires_at.gt.${now}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("BlockTiers ban check failed:", error);
            throw new Error("Could not verify your account status.");
        }

        return data;
    }

    function formatBanExpiry(expiresAt) {
        if (!expiresAt) {
            return "Permanent";
        }

        return new Date(expiresAt).toLocaleString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    async function checkBanAndSignOut(user) {
        const ban = await getActiveBan(user.id);

        if (!ban) {
            return null;
        }

        await client.auth.signOut();

        return ban;
    }

    async function signUp(displayName, username, password) {
        displayName = displayName.trim();
        username = username.trim();

        if (displayName.length < 2 || displayName.length > 32) {
            throw new Error("Display name must be between 2 and 32 characters.");
        }

        if (!validUsername(username)) {
            throw new Error(
                "Username must be 3–20 characters and use only letters, numbers, or underscores."
            );
        }

        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
        }

        const internalEmail =
            `${username.toLowerCase()}@accounts.blocktiers.local`;

        const { data, error } = await client.auth.signUp({
            email: internalEmail,
            password,
            options: {
                data: {
                    username,
                    display_name: displayName
                }
            }
        });

        if (error) {
            if (error.message.toLowerCase().includes("already registered")) {
                throw new Error("That username is already taken.");
            }

            throw error;
        }

        if (!data.session) {
            throw new Error(
                "Account created, but email confirmation is enabled in Supabase Auth. Disable email confirmation in your Supabase Auth settings."
            );
        }

        return data;
    }

    async function login(username, password) {
        username = username.trim();

        if (!validUsername(username)) {
            throw new Error("Enter a valid username.");
        }

        const internalEmail =
            `${username.toLowerCase()}@accounts.blocktiers.local`;

        const { data, error } = await client.auth.signInWithPassword({
            email: internalEmail,
            password
        });

        if (error) {
            throw new Error("Incorrect username or password.");
        }

        const user = data.user;

        if (!user) {
            throw new Error("Could not load your account.");
        }

        const ban = await checkBanAndSignOut(user);

        if (ban) {
            const expiry = formatBanExpiry(ban.expires_at);

            throw new Error(
                `You are banned from BlockTiers. Reason: ${ban.reason} | Expires: ${expiry}`
            );
        }

        return data;
    }

    async function updateAuthUI() {
        const {
            data: { user }
        } = await client.auth.getUser();

        const slot = byId("account-slot");

        if (!slot) return;

        if (!user) {
            slot.innerHTML =
                `<a href="login.html" class="account-button">Login</a>`;
            return;
        }

        let profile;

        try {
            profile = await getProfile(user);
        } catch {
            profile = {
                display_name:
                    user.user_metadata?.display_name || "Player",
                username:
                    user.user_metadata?.username || "player"
            };
        }

        slot.innerHTML = `
            <a href="profile.html" class="account-button account-logged">
                <span class="account-avatar">
                    ${profile.display_name.charAt(0).toUpperCase()}
                </span>
                <span>${escapeHtml(profile.display_name)}</span>
            </a>
        `;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    const signupForm = byId("signup-form");

    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const displayName = byId("display-name").value;
            const username = byId("username").value;
            const password = byId("password").value;
            const confirmPassword = byId("confirm-password").value;

            if (password !== confirmPassword) {
                setMessage(
                    "signup-message",
                    "Passwords do not match.",
                    "error"
                );
                return;
            }

            const button =
                signupForm.querySelector("button[type=submit]");

            button.disabled = true;
            button.textContent = "Creating account...";
            setMessage("signup-message", "");

            try {
                await signUp(displayName, username, password);

                setMessage(
                    "signup-message",
                    "Account created. Redirecting...",
                    "success"
                );

                setTimeout(() => {
                    location.href = "profile.html";
                }, 500);
            } catch (error) {
                setMessage(
                    "signup-message",
                    error.message,
                    "error"
                );

                button.disabled = false;
                button.textContent = "Create Account";
            }
        });
    }

    const loginForm = byId("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = byId("login-username").value;
            const password = byId("login-password").value;

            const button =
                loginForm.querySelector("button[type=submit)");

            button.disabled = true;
            button.textContent = "Logging in...";
            setMessage("login-message", "");

            try {
                await login(username, password);

                setMessage(
                    "login-message",
                    "Login successful. Redirecting...",
                    "success"
                );

                setTimeout(() => {
                    location.href = "profile.html";
                }, 500);
            } catch (error) {
                setMessage(
                    "login-message",
                    error.message,
                    "error"
                );

                button.disabled = false;
                button.textContent = "Login";
            }
        });
    }

    const profilePage = byId("profile-page");

    if (profilePage) {
        (async () => {
            const {
                data: { user }
            } = await client.auth.getUser();

            if (!user) {
                location.href = "login.html";
                return;
            }

            try {
                const ban = await getActiveBan(user.id);

                if (ban) {
                    await client.auth.signOut();

                    setTimeout(() => {
                        location.href = "login.html";
                    }, 100);

                    return;
                }

                const profile = await getProfile(user);

                const nameElement = byId("profile-display-name");

                renderUsername(
                    nameElement,
                    profile.display_name,
                    profile.username
                );

                byId("profile-username").textContent =
                    `@${profile.username}`;

                byId("profile-avatar").textContent =
                    profile.display_name.charAt(0).toUpperCase();

                const date = new Date(profile.created_at);

                byId("profile-created").textContent =
                    date.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    });
            } catch {
                const errorElement = byId("profile-error");

                if (errorElement) {
                    errorElement.textContent =
                        "Could not load your profile.";
                }
            }

            const logoutButton = byId("logout-button");

            if (logoutButton) {
                logoutButton.addEventListener(
                    "click",
                    async () => {
                        await client.auth.signOut();
                        location.href = "index.html";
                    }
                );
            }
        })();
    }

    client.auth.onAuthStateChange(() => {
        updateAuthUI();
    });

    updateAuthUI();
})();

