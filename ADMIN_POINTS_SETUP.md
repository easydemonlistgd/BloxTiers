# BlockTiers Admin Points Setup

## 1. Run the SQL
Open Supabase Dashboard -> SQL Editor and run `SUPABASE_SETUP.sql`.

If your account username is NOT `RedaPlayz`, edit the admin setup line near the bottom:
`where username = 'RedaPlayz'`
and replace it with your exact BlockTiers username.

If you already ran an older version of `SUPABASE_SETUP.sql`, run this updated file again. It is designed to keep the existing account system and add the ranking/admin system.

## 2. Deploy the website
Upload/push the updated project files.

## 3. Test
Log into the admin account. On Mace, Sword, Crystal, Axe, UHC, and SMP, an `Edit Points` button will appear in the ranking header.

Choose a player, change their points, and press `Save Points`.

Normal accounts will not see the button and Supabase also blocks them from changing rankings directly.

## Important
The current leaderboard design is unchanged. The only visible addition for admins is the Edit Points button and its editor modal.
