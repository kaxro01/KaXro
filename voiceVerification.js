import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus
} from '@discordjs/voice';

import {
    createReadStream,
    existsSync
} from 'node:fs';

import path from 'node:path';

const VERIFICATION_VC_ID = '1549522340323393636';
const MEMBER_ROLE_ID = '1536690103311929406';

const AUDIO_FILE = path.join(
    process.cwd(),
    'assets',
    'kaxro_intro.wav'
);

let connection = null;
let player = null;

let currentMemberId = null;
let isPlaying = false;

const queuedMembers = [];
const verifiedMembers = new Set();

export default {
    name: 'ready',
    once: true,

    async execute(client) {
        try {
            const guild = client.guilds.cache.find(guild =>
                guild.channels.cache.has(VERIFICATION_VC_ID)
            );

            if (!guild) {
                console.error(
                    '[Voice Verification] Verification VC not found.'
                );
                return;
            }

            const channel = guild.channels.cache.get(
                VERIFICATION_VC_ID
            );

            if (!channel) {
                console.error(
                    '[Voice Verification] Verification VC not found.'
                );
                return;
            }

            if (!existsSync(AUDIO_FILE)) {
                console.error(
                    `[Voice Verification] Audio file not found: ${AUDIO_FILE}`
                );
                return;
            }

            connection = joinVoiceChannel({
                channelId: VERIFICATION_VC_ID,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });

            connection.on(
                VoiceConnectionStatus.Ready,
                () => {
                    console.log(
                        '[Voice Verification] KaXro connected to Verification VC.'
                    );
                }
            );

            connection.on(
                VoiceConnectionStatus.Disconnected,
                () => {
                    console.log(
                        '[Voice Verification] KaXro disconnected from Verification VC.'
                    );
                }
            );

            player = createAudioPlayer();

            player.on('error', error => {
                console.error(
                    '[Voice Verification] Audio player error:',
                    error
                );

                isPlaying = false;
                currentMemberId = null;

                startNextMember(client);
            });

            client.on(
                'voiceStateUpdate',
                async (oldState, newState) => {
                    await handleVoiceStateUpdate(
                        oldState,
                        newState
                    );
                }
            );

            console.log(
                '[Voice Verification] Local audio verification system ready.'
            );

            console.log(
                `[Voice Verification] Audio file: ${AUDIO_FILE}`
            );

        } catch (error) {
            console.error(
                '[Voice Verification] Failed to start:',
                error
            );
        }
    }
};

async function handleVoiceStateUpdate(oldState, newState) {
    const member =
        newState.member ||
        oldState.member;

    if (!member) return;

    if (member.user?.bot) return;

    /*
     * Member joins Verification VC.
     */
    if (
        newState.channelId === VERIFICATION_VC_ID &&
        oldState.channelId !== VERIFICATION_VC_ID
    ) {
        await handleMemberJoin(member);
    }
}

async function handleMemberJoin(member) {
    if (!member) return;

    /*
     * Already has Member role.
     */
    if (
        member.roles.cache.has(
            MEMBER_ROLE_ID
        )
    ) {
        return;
    }

    /*
     * Already verified during this bot session.
     */
    if (verifiedMembers.has(member.id)) {
        return;
    }

    /*
     * Currently being processed.
     */
    if (currentMemberId === member.id) {
        return;
    }

    /*
     * Already waiting in queue.
     */
    if (queuedMembers.includes(member.id)) {
        return;
    }

    console.log(
        `[Voice Verification] ${member.user.tag} joined Verification VC.`
    );

    /*
     * If someone else is being verified,
     * add this member to the queue.
     */
    if (isPlaying) {
        queuedMembers.push(member.id);

        console.log(
            `[Voice Verification] ${member.user.tag} added to verification queue.`
        );

        return;
    }

    await playIntroduction(member);
}

async function playIntroduction(member) {
    if (!connection || !player) {
        console.error(
            '[Voice Verification] Voice system is not ready.'
        );
        return;
    }

    /*
     * Member must still be inside
     * the Verification VC.
     */
    if (
        member.voice.channelId !==
        VERIFICATION_VC_ID
    ) {
        console.log(
            `[Voice Verification] ${member.user.tag} is no longer in Verification VC.`
        );

        return;
    }

    /*
     * Make sure the local audio file exists.
     */
    if (!existsSync(AUDIO_FILE)) {
        console.error(
            `[Voice Verification] Audio file not found: ${AUDIO_FILE}`
        );

        return;
    }

    isPlaying = true;
    currentMemberId = member.id;

    try {
        console.log(
            `[Voice Verification] Starting introduction for ${member.user.tag}.`
        );

        /*
         * Subscribe the audio player to the
         * permanent Verification VC connection.
         */
        connection.subscribe(player);

        /*
         * Load the local WAV file.
         *
         * NO API
         * NO FETCH
         * NO CLOUDFLARE
         */
        const resource = createAudioResource(
            createReadStream(AUDIO_FILE)
        );

        /*
         * Wait until the complete audio finishes.
         */
        const finished = new Promise(
            (resolve, reject) => {
                const onIdle = () => {
                    cleanup();
                    resolve();
                };

                const onError = error => {
                    cleanup();
                    reject(error);
                };

                const cleanup = () => {
                    player.off(
                        AudioPlayerStatus.Idle,
                        onIdle
                    );

                    player.off(
                        'error',
                        onError
                    );
                };

                player.once(
                    AudioPlayerStatus.Idle,
                    onIdle
                );

                player.once(
                    'error',
                    onError
                );
            }
        );

        console.log(
            `[Voice Verification] Playing local introduction for ${member.user.tag}...`
        );

        player.play(resource);

        /*
         * Wait for the ENTIRE intro to finish.
         */
        await finished;

        console.log(
            `[Voice Verification] Introduction finished for ${member.user.tag}.`
        );

        /*
         * Give Member role immediately after
         * the audio finishes.
         */
        await verifyMember(member);

    } catch (error) {
        console.error(
            `[Voice Verification] Error for ${member.user.tag}:`,
            error
        );

    } finally {
        isPlaying = false;
        currentMemberId = null;

        /*
         * Start the next person in the queue.
         */
        await startNextMember(member.client);
    }
}

async function verifyMember(member) {
    if (!member) return;

    /*
     * Already has Member role.
     */
    if (
        member.roles.cache.has(
            MEMBER_ROLE_ID
        )
    ) {
        verifiedMembers.add(member.id);
        return;
    }

    try {
        await member.roles.add(
            MEMBER_ROLE_ID,
            'Completed KaXro voice verification'
        );

        verifiedMembers.add(member.id);

        console.log(
            `[Voice Verification] ${member.user.tag} verified successfully. Member role granted.`
        );

    } catch (error) {
        console.error(
            `[Voice Verification] Failed to give Member role to ${member.user.tag}:`,
            error
        );
    }
}

async function startNextMember(client) {
    if (isPlaying) return;

    if (queuedMembers.length === 0) {
        return;
    }

    const nextMemberId =
        queuedMembers.shift();

    if (!nextMemberId) {
        return;
    }

    const guild =
        client.guilds.cache.find(guild =>
            guild.members.cache.has(
                nextMemberId
            )
        );

    if (!guild) {
        await startNextMember(client);
        return;
    }

    const member =
        guild.members.cache.get(
            nextMemberId
        );

    if (!member) {
        await startNextMember(client);
        return;
    }

    /*
     * Skip if already verified.
     */
    if (
        member.roles.cache.has(
            MEMBER_ROLE_ID
        )
    ) {
        verifiedMembers.add(member.id);

        await startNextMember(client);
        return;
    }

    /*
     * Skip if they left the Verification VC.
     */
    if (
        member.voice.channelId !==
        VERIFICATION_VC_ID
    ) {
        console.log(
            `[Voice Verification] ${member.user.tag} left before their verification turn.`
        );

        await startNextMember(client);
        return;
    }

    await playIntroduction(member);
}
