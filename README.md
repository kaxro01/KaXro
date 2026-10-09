# KaXro
## Music System

KaXro now includes slash-command music controls through Riffy and Lavalink v4.

Commands:
- `/play query` — play a song or add it to the queue
- `/pause` — pause playback
- `/resume` — resume playback
- `/skip` — skip the current track
- `/stop` — stop music, clear the queue, and leave VC
- `/queue` — show the queue
- `/nowplaying` — show the current track
- `/volume amount` — set/view volume
- `/loop mode` — off, track, or queue

A Lavalink v4 node is required for music. The default uses HeavenCloud's currently published public test node; configure it with `KAXRO_LAVALINK_HOST`, `KAXRO_LAVALINK_PORT`, `KAXRO_LAVALINK_PASSWORD`, and `KAXRO_LAVALINK_SECURE` in `.env` or the hosting panel. Public nodes are best for testing/light traffic.


## Music System

Discord login is independent of slash-command registration, voice verification, and Lavalink connectivity. If command registration fails, check that `CLIENT_ID` matches the bot token and `GUILD_ID` is a server KaXro has joined. Voice verification is disabled unless `VERIFICATION_VOICE_CHANNEL_ID` and `VERIFICATION_MEMBER_ROLE_ID` are set to accessible IDs.
