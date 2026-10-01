BLOCKTIERS PASSWORD RECOVERY SETUP

1. Run recovery.sql in Supabase SQL Editor.

2. Replace your current js/auth.js with js/auth.js from this package.

3. Replace your current profile.html with profile.html from this package.

4. Add forgot-password.html, reset-password.html, and verify-email.html to the root of the BlockTiers website.

5. Deploy supabase/functions/account-auth/index.ts as a Supabase Edge Function named:

   account-auth

6. Add these redirect URLs in Supabase Auth URL Configuration:

   https://easydemonlistgd.github.io/BloxTiers/reset-password.html
   https://easydemonlistgd.github.io/BloxTiers/verify-email.html

7. Add the Forgot Password link from login-forgot-password.txt to login.html.

FLOW

Existing account without recovery email:
username + password -> Edge Function -> fake internal Auth email -> normal login

Account with verified recovery email:
username + password -> Edge Function -> verified recovery email -> normal login

Forgot password:
username -> Edge Function -> verified recovery email -> Supabase recovery email -> reset-password.html -> new password

Recovery email setup:
profile -> add email -> Supabase email-change verification -> verify-email.html -> recovery_email becomes verified

IMPORTANT

The Edge Function uses the Supabase service-role key only on the server to look up the username mapping. Never put that key into any HTML, JavaScript, or client-side configuration file.
