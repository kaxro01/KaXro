import {
    SlashCommandBuilder,
    EmbedBuilder,
} from 'discord.js';
import { Riffy } from 'riffy';

const MUSIC_COLOR = 0x5865F2;
const MUSIC_ROLE_ID = '1552646358601695312';

function getVoiceChannel(interaction) {
    return interaction.member?.voice?.channel || null;
}

function getPlayer(interaction) {
    return interaction.client.riffy?.players?.get(interaction.guildId) || null;
}

function ensureSameVoice(interaction, player) {
    if (!player?.voiceChannel) return true;
    return player.voiceChannel === interaction.member.voice.channelId;
}

function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return 'LIVE';
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function musicCommand(name, description) {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .setDMPermission(false);
}

const play = {
    data: musicCommand('play', 'Play a song or add it to the queue.')
        .addStringOption(option => option
            .setName('query')
            .setDescription('Song name, YouTube URL, SoundCloud URL, or playlist URL.')
            .setRequired(true)
            .setMaxLength(200)),

    async execute(interaction) {
        const voice = getVoiceChannel(interaction);
        if (!voice) {
            return interaction.reply({ content: 'You need to be in a voice channel first.', ephemeral: true });
        }

        const permissions = voice.permissionsFor(interaction.client.user);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return interaction.reply({ content: 'I need Connect and Speak permissions in your voice channel.', ephemeral: true });
        }

        const existing = getPlayer(interaction);
        if (existing && existing.voiceChannel && existing.voiceChannel !== voice.id) {
            return interaction.reply({ content: 'I am already playing music in another voice channel.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const player = existing || interaction.client.riffy.createConnection({
                guildId: interaction.guildId,
                voiceChannel: voice.id,
                textChannel: interaction.channelId,
                deaf: true,
            });

            const query = interaction.options.getString('query', true).trim();
            const isUrl = /^https?:\/\//i.test(query);
            const resolve = await interaction.client.riffy.resolve({
                query: isUrl ? query : `${process.env.LAVALINK_SEARCH || 'ytmsearch'}:${query}`,
                requester: interaction.user,
            });

            if (!resolve?.tracks?.length) {
                return interaction.editReply('No playable results were found.');
            }

            if (resolve.loadType === 'playlist') {
                for (const track of resolve.tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                }

                if (!player.playing && !player.paused) await player.play();

                return interaction.editReply(`Added **${resolve.tracks.length}** tracks from **${resolve.playlistInfo?.name || 'playlist'}** to the queue.`);
            }

            const track = resolve.tracks[0];
            track.info.requester = interaction.user;
            player.queue.add(track);

            const shouldStart = !player.playing && !player.paused;
            if (shouldStart) await player.play();

            const position = player.queue.size;
            return interaction.editReply(
                shouldStart
                    ? `Now playing **${track.info.title}**.`
                    : `Added **${track.info.title}** to the queue${position > 0 ? ` at position **${position}**` : ''}.`,
            );
        } catch (error) {
            console.error('Music play error:', error);
            return interaction.editReply('I could not play that track. Check that the Lavalink node is online and try again.');
        }
    },
};


const playNow = {
    data: musicCommand('playnow', 'Play a song immediately and replace the current queue.')
        .addStringOption(option => option
            .setName('query')
            .setDescription('Song name or direct music URL.')
            .setRequired(true)
            .setMaxLength(200)),

    async execute(interaction) {
        const voice = getVoiceChannel(interaction);
        if (!voice) {
            return interaction.reply({ content: 'You need to be in a voice channel first.', ephemeral: true });
        }

        const permissions = voice.permissionsFor(interaction.client.user);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return interaction.reply({ content: 'I need Connect and Speak permissions in your voice channel.', ephemeral: true });
        }

        const existing = getPlayer(interaction);
        if (existing && existing.voiceChannel && existing.voiceChannel !== voice.id) {
            return interaction.reply({ content: 'I am already playing music in another voice channel.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const player = existing || interaction.client.riffy.createConnection({
                guildId: interaction.guildId,
                voiceChannel: voice.id,
                textChannel: interaction.channelId,
                deaf: true,
            });

            const query = interaction.options.getString('query', true).trim();
            const isUrl = /^https?:\/\//i.test(query);
            const resolve = await interaction.client.riffy.resolve({
                query: isUrl ? query : `${process.env.LAVALINK_SEARCH || 'ytmsearch'}:${query}`,
                requester: interaction.user,
            });

            if (!resolve?.tracks?.length) {
                return interaction.editReply('No playable results were found.');
            }

            player.queue.clear();
            if (player.current || player.playing || player.paused) {
                await player.stop();
            }

            const track = resolve.tracks[0];
            track.info.requester = interaction.user;
            player.queue.add(track);
            await player.play();

            return interaction.editReply(`Now playing **${track.info.title}**.`);
        } catch (error) {
            console.error('Music playnow error:', error);
            return interaction.editReply('I could not play that track. Check that the Lavalink node is online and try again.');
        }
    },
};

const pause = {
    data: musicCommand('pause', 'Pause the current music.'),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player?.playing) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (!ensureSameVoice(interaction, player)) return interaction.reply({ content: 'You must be in my voice channel to control the music.', ephemeral: true });
        player.pause();
        return interaction.reply('Music paused.');
    },
};

const resume = {
    data: musicCommand('resume', 'Resume paused music.'),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (!ensureSameVoice(interaction, player)) return interaction.reply({ content: 'You must be in my voice channel to control the music.', ephemeral: true });
        player.resume();
        return interaction.reply('Music resumed.');
    },
};

const skip = {
    data: musicCommand('skip', 'Skip the current track.'),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player?.current) return interaction.reply({ content: 'There is no track to skip.', ephemeral: true });
        if (!ensureSameVoice(interaction, player)) return interaction.reply({ content: 'You must be in my voice channel to control the music.', ephemeral: true });
        await player.stop();
        return interaction.reply('Skipped the current track.');
    },
};

const stop = {
    data: musicCommand('stop', 'Stop music, clear the queue, and leave the VC.'),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player) return interaction.reply({ content: 'I am not playing music right now.', ephemeral: true });
        if (!ensureSameVoice(interaction, player)) return interaction.reply({ content: 'You must be in my voice channel to control the music.', ephemeral: true });
        player.queue.clear();
        player.destroy();
        return interaction.reply('Music stopped and I left the voice channel.');
    },
};

const queue = {
    data: musicCommand('queue', 'Show the current music queue.'),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player?.current) return interaction.reply({ content: 'The music queue is empty.', ephemeral: true });

        const tracks = Array.from(player.queue || []);
        const lines = tracks.slice(0, 10).map((track, index) => `${index + 1}. **${track.info.title}** — ${formatDuration(track.info.length)}`);
        const embed = new EmbedBuilder()
            .setColor(MUSIC_COLOR)
            .setTitle('KaXro Music Queue')
            .addFields({ name: 'Now Playing', value: `**${player.current.info.title}** — ${formatDuration(player.current.info.length)}` });

        if (lines.length) embed.addFields({ name: `Up Next (${tracks.length})`, value: lines.join('\n') });
        else embed.setDescription('Nothing is queued after the current track.');

        return interaction.reply({ embeds: [embed] });
    },
};

const nowPlaying = {
    data: musicCommand('nowplaying', 'Show the currently playing track.'),
    async execute(interaction) {
        const player = getPlayer(interaction);
        const track = player?.current;
        if (!track) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(MUSIC_COLOR)
            .setTitle('Now Playing')
            .setDescription(`**${track.info.title}**\n${track.info.author || 'Unknown artist'}`)
            .addFields(
                { name: 'Duration', value: formatDuration(track.info.length), inline: true },
                { name: 'Volume', value: `${player.volume}%`, inline: true },
                { name: 'Loop', value: player.loop || 'none', inline: true },
            );

        if (track.info.uri) embed.setURL(track.info.uri);
        if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);

        return interaction.reply({ embeds: [embed] });
    },
};

const volume = {
    data: musicCommand('volume', 'Set or view the music volume.')
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('Volume from 1 to 100.')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (!ensureSameVoice(interaction, player)) return interaction.reply({ content: 'You must be in my voice channel to control the music.', ephemeral: true });
        const amount = interaction.options.getInteger('amount');
        if (amount === null) return interaction.reply(`Current volume: **${player.volume}%**.`);
        await player.setVolume(amount);
        return interaction.reply(`Volume set to **${amount}%**.`);
    },
};

const loop = {
    data: musicCommand('loop', 'Change the music loop mode.')
        .addStringOption(option => option
            .setName('mode')
            .setDescription('Loop mode.')
            .setRequired(true)
            .addChoices(
                { name: 'Off', value: 'none' },
                { name: 'Track', value: 'track' },
                { name: 'Queue', value: 'queue' },
            )),
    async execute(interaction) {
        const player = getPlayer(interaction);
        if (!player) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (!ensureSameVoice(interaction, player)) return interaction.reply({ content: 'You must be in my voice channel to control the music.', ephemeral: true });
        const mode = interaction.options.getString('mode', true);
        await player.setLoop(mode);
        return interaction.reply(`Loop mode set to **${mode}**.`);
    },
};

export const musicCommands = [
    play,
    playNow,
    pause,
    resume,
    skip,
    stop,
    queue,
    nowPlaying,
    volume,
    loop,
];

export function setupMusic(client) {
    const host = process.env.LAVALINK_HOST;
    const password = process.env.LAVALINK_PASSWORD;
    const port = Number(process.env.LAVALINK_PORT || 2333);
    const secure = String(process.env.LAVALINK_SECURE || 'false').toLowerCase() === 'true';

    if (!host || !password) {
        console.warn('⚠️ Music system disabled: LAVALINK_HOST or LAVALINK_PASSWORD is missing.');
        return false;
    }

    const nodes = [{
        name: process.env.LAVALINK_NAME || 'KaXro-Lavalink',
        host,
        password,
        port,
        secure,
    }];

    client.riffy = new Riffy(client, nodes, {
        send: payload => {
            const guild = client.guilds.cache.get(payload.d.guild_id);
            if (guild) guild.shard.send(payload);
        },
        defaultSearchPlatform: process.env.LAVALINK_SEARCH || 'ytmsearch',
        restVersion: 'v4',
    });

    client.on('raw', packet => {
        if (packet.t === 'VOICE_STATE_UPDATE' || packet.t === 'VOICE_SERVER_UPDATE') {
            client.riffy.updateVoiceState(packet);
        }
    });

    client.riffy.on('nodeConnect', node => console.log(`🎵 Lavalink node connected: ${node.name}`));
    client.riffy.on('nodeError', (node, error) => console.error(`❌ Lavalink node error (${node.name}):`, error));
    client.riffy.on('trackStart', (player, track) => {
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) channel.send(`Now playing: **${track.info.title}**`).catch(() => {});
    });
    client.riffy.on('trackError', (player, track, payload) => {
        console.error(`❌ Track error for ${track?.info?.title || 'unknown track'}:`, payload);
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) channel.send('This track could not be played. Skipping to the next track.').catch(() => {});
    });
    client.riffy.on('queueEnd', player => {
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) channel.send('Queue finished.').catch(() => {});
        player.destroy();
    });

    return true;
}
