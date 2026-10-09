import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} from '@discordjs/voice';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOICE_CHANNEL_ID = process.env.VERIFICATION_VOICE_CHANNEL_ID?.trim();
const MEMBER_ROLE_ID = process.env.VERIFICATION_MEMBER_ROLE_ID?.trim();

const AUDIO_FILE = path.join(
    __dirname,
    'KaXro_intro.wav',
);

export default {
    name: 'voiceVerification',
    once: true,

    async execute(client) {
        if (!VOICE_CHANNEL_ID || !MEMBER_ROLE_ID) {
            console.log('ℹ️ Voice verification is disabled. Set VERIFICATION_VOICE_CHANNEL_ID and VERIFICATION_MEMBER_ROLE_ID to enable it.');
            return;
        }

        try {
            const channel = await client.channels.fetch(
                VOICE_CHANNEL_ID,
            );

            if (!channel) {
                console.error(
                    '❌ Voice verification channel not found.',
                );
                return;
            }

            if (!channel.isVoiceBased()) {
                console.error(
                    '❌ The verification channel is not a voice channel.',
                );
                return;
            }

            console.log(
                `🔊 Joining verification VC: ${channel.name}`,
            );

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });

            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play,
                },
            });

            connection.subscribe(player);

            console.log('✅ KaXro joined the verification VC.');

            const resource = createAudioResource(
                AUDIO_FILE,
            );

            player.play(resource);

            player.on(
                AudioPlayerStatus.Playing,
                () => {
                    console.log(
                        '🔊 KaXro intro audio is playing.',
                    );
                },
            );

            player.on(
                AudioPlayerStatus.Idle,
                () => {
                    console.log(
                        '✅ KaXro intro audio finished.',
                    );
                },
            );

            player.on('error', error => {
                console.error(
                    '❌ Audio player error:',
                    error,
                );
            });

            connection.on('error', error => {
                console.error(
                    '❌ Voice connection error:',
                    error,
                );
            });

            client.on(
                'voiceStateUpdate',
                async (oldState, newState) => {
                    try {
                        if (
                            newState.channelId !==
                            VOICE_CHANNEL_ID
                        ) {
                            return;
                        }

                        const member = newState.member;

                        if (!member || member.user.bot) {
                            return;
                        }

                        if (
                            member.roles.cache.has(
                                MEMBER_ROLE_ID,
                            )
                        ) {
                            return;
                        }

                        console.log(
                            `🎧 ${member.user.tag} joined verification VC.`,
                        );

                        const memberResource =
                            createAudioResource(
                                AUDIO_FILE,
                            );

                        player.play(memberResource);

                        await member.roles.add(
                            MEMBER_ROLE_ID,
                            'Voice verification completed',
                        );

                        console.log(
                            `✅ Verification role given to ${member.user.tag}.`,
                        );
                    } catch (error) {
                        console.error(
                            '❌ Voice verification error:',
                            error,
                        );
                    }
                },
            );
        } catch (error) {
            console.error(
                '❌ Could not join verification VC:',
                error,
            );
        }
    },
};
