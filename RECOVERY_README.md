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

Verification VC constants found in the backup:
- Verification VC ID: `1549522340323393636`
- Member role ID: `1536690103311929406`
- Audio: `assets/kaxro_intro.wav`
