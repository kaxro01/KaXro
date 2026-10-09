# KaXro startup repair notes

- Discord login now occurs before slash-command registration. A missing-access or mismatched-ID error will be logged without stopping the bot.
- `CLIENT_ID` is checked against the logged-in bot ID; `GUILD_ID` is checked against guilds the bot can see.
- Music uses HeavenCloud's currently published public Lavalink node by default. Its settings use `KAXRO_LAVALINK_*` so old saved `LAVALINK_*` panel variables cannot silently re-select the stale Singapore hostname.
- Voice verification is optional. It only starts when both `VERIFICATION_VOICE_CHANNEL_ID` and `VERIFICATION_MEMBER_ROLE_ID` are configured.
- The existing project files and any included `.env` values for Discord token/application/server were preserved in this local output. Do not share the `.env` publicly.

If slash commands still fail after login, invite the same bot to the target server using the `bot` and `applications.commands` scopes, then confirm `CLIENT_ID` and `GUILD_ID` in the hosting environment. `Missing Access` for a voice channel means the configured channel is inaccessible to this bot; set valid IDs and grant View Channel, Connect, and Speak if enabling voice verification.
