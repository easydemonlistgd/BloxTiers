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

    // List of admin usernames (Change "YourUsernameHere" to your actual account username)
    const adminUsers = ["redaplayz", "AnotherAdmin"];

    function renderUsername(element, displayName, username) {
        // Check if the account username is in the admin list
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
                "Account created, but email confirmation is enabled in Supabase. Disable email confirmation in your Supabase Auth settings."
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

        return data;
    }

    async function updateAuthUI() {
        const { data: { user } } = await client.auth.getUser();
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
                loginForm.querySelector("button[type=submit]");

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
                const profile = await getProfile(user);

                // This checks if their username is an admin, and displays the badge next to their display name
                const nameElement = byId("profile-display-name");
                renderUsername(nameElement, profile.display_name, profile.username);

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
                byId("profile-error").textContent =
                    "Could not load your profile.";
            }

            byId("logout-button").addEventListener(
                "click",
                async () => {
                    await client.auth.signOut();
                    location.href = "index.html";
                }
            );
        })();
    }

    client.auth.onAuthStateChange(() => {
        updateAuthUI();
    });

    updateAuthUI();
})();
