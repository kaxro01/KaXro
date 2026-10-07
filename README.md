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

A Lavalink v4 node is required. Put its host, port, password, and secure setting in the environment variables shown in `.env.example`. Riffy supports Lavalink v3/v4 and uses the Discord voice gateway updates to connect the player to the user's VC.


## Music System

The music system is configured in the bot code to use the HeavenCloud Singapore Lavalink v4 node (`sg.lavalink.heavencloud.in:443` with SSL).
