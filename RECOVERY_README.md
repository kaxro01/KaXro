# KaXro Selected Recovery

Recovered from the uploaded `KaXrol-main` backup.

Included features only:
- Verification VC system
  - `src/events/voiceVerification.js`
  - `assets/kaxro_intro.wav`
- `/say`
  - `src/commands/Moderation/say.js`
- `/embedbuilder`
  - `src/commands/Tools/embedbuilder.js`

Important:
These files are extracted exactly from the backup. The command files rely on the
shared bot utilities/config already used by the original repository
(`src/utils/*` and `src/config/bot.js`). The Verification VC system additionally
requires `@discordjs/voice`.

Voice verification is now optional and reads its IDs from environment variables:
- `VERIFICATION_VOICE_CHANNEL_ID`
- `VERIFICATION_MEMBER_ROLE_ID`
- Audio file in this project: `KaXro_intro.wav`

Leave either ID blank to keep voice verification disabled. If enabling it, use IDs from a channel and role in a server that KaXro can access.
