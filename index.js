import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    Collection,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';

import embedBuilder from './embedBuilder.js';
import say from './Say.js';
import voiceVerification from './voiceVerification.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
    console.error('❌ Missing DISCORD_TOKEN');
    process.exit(1);
}

if (!clientId) {
    console.error('❌ Missing CLIENT_ID');
    process.exit(1);
}

/* =========================
   SPIN SYSTEM CONFIG
   ========================= */

const DATA_FILE = path.join(process.cwd(), 'spin-data.json');
const MESSAGE_GOAL = 500;

const REWARDS = [
    { name: '100 Points', emoji: '💰', weight: 10 },
    { name: '50 XP', emoji: '⭐', weight: 20 },
    { name: '+1 Spin', emoji: '🔄', weight: 20 },
    { name: 'Nothing', emoji: '❌', weight: 50 },
];

function loadSpinData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return {};
        }

        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (error) {
        console.error('❌ Could not read spin-data.json:', error);
        return {};
    }
}

let spinData = loadSpinData();

function saveSpinData() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(spinData, null, 2),
            'utf8',
        );
    } catch (error) {
        console.error('❌ Could not save spin-data.json:', error);
    }
}

function getUser(guildId, userId) {
    if (!spinData[guildId]) {
        spinData[guildId] = {};
    }

    if (!spinData[guildId][userId]) {
        spinData[guildId][userId] = {
            messages: 0,
            spins: 0,
        };
    }

    return spinData[guildId][userId];
}

function chooseReward() {
    const totalWeight = REWARDS.reduce(
        (total, reward) => total + reward.weight,
        0,
    );

    let random = Math.random() * totalWeight;

    for (const reward of REWARDS) {
        random -= reward.weight;

        if (random < 0) {
            return reward;
        }
    }

    return REWARDS[REWARDS.length - 1];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================
   SPIN WHEEL EMBED
   ========================= */

function createSpinEmbed() {
    return new EmbedBuilder()
        .setTitle('🎰 Brainrot Spin Wheel')
        .setDescription(
            [
                'Spin the wheel for a random reward.',
                '',
                '🎁 **Rewards**',
                '💰 **10%** — 100 Points',
                '⭐ **20%** — 50 XP',
                '🔄 **20%** — +1 Spin',
                '❌ **50%** — Nothing',
                '',
                `💬 **${MESSAGE_GOAL} messages = 2 Spins**`,
                '',
                'Use the buttons below to spin or check your balance.',
            ].join('\n'),
        )
        .setFooter({
            text: 'KaXro Spin System',
        });
}

function createSpinButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('kaxro_spin')
            .setLabel('Spin')
            .setEmoji('🎰')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('kaxro_check_spins')
            .setLabel('Check Spins')
            .setEmoji('📊')
            .setStyle(ButtonStyle.Secondary),
    );
}

/* =========================
   COMMANDS
   ========================= */

const spinWheelCommand = {
    data: new SlashCommandBuilder()
        .setName('spinwheel')
        .setDescription('Send the Brainrot Spin Wheel panel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),

    async execute(interaction) {
        await interaction.channel.send({
            embeds: [createSpinEmbed()],
            components: [createSpinButtons()],
        });

        await interaction.reply({
            content: '✅ Spin Wheel panel sent.',
            ephemeral: true,
        });
    },
};

const addSpinsCommand = {
    data: new SlashCommandBuilder()
        .setName('addspins')
        .setDescription('Add spins to a member.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Member receiving the spins.')
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of spins to add.')
                .setMinValue(1)
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        const data = getUser(interaction.guildId, user.id);
        data.spins += amount;
        saveSpinData();

        await interaction.reply({
            content:
                `🎰 Added **${amount}** spin${amount === 1 ? '' : 's'} to ${user}.\n` +
                `Current balance: **${data.spins}**`,
            ephemeral: true,
        });
    },
};

const removeSpinsCommand = {
    data: new SlashCommandBuilder()
        .setName('removespins')
        .setDescription('Remove spins from a member.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Member losing the spins.')
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of spins to remove.')
                .setMinValue(1)
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        const data = getUser(interaction.guildId, user.id);
        data.spins = Math.max(0, data.spins - amount);
        saveSpinData();

        await interaction.reply({
            content:
                `🗑️ Removed **${amount}** spin${amount === 1 ? '' : 's'} from ${user}.\n` +
                `Current balance: **${data.spins}**`,
            ephemeral: true,
        });
    },
};

/* =========================
   CLIENT
   ========================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

const commands = [
    embedBuilder,
    say,
    spinWheelCommand,
    addSpinsCommand,
    removeSpinsCommand,
];

for (const command of commands) {
    if (!command?.data?.name || typeof command.execute !== 'function') {
        console.error('❌ Invalid command module.');
        continue;
    }

    client.commands.set(command.data.name, command);
}

const rest = new REST({ version: '10' }).setToken(token);

async function registerCommands() {
    const commandData = commands.map(command =>
        command.data.toJSON(),
    );

    console.log('🔄 Registering slash commands...');

    if (guildId) {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            {
                body: commandData,
            },
        );

        console.log(`✅ Registered commands in guild ${guildId}`);
    } else {
        await rest.put(
            Routes.applicationCommands(clientId),
            {
                body: commandData,
            },
        );

        console.log('✅ Registered global slash commands.');
    }
}

client.once('ready', async () => {
    console.log(`✅ KaXro is online as ${client.user.tag}`);

    try {
        await voiceVerification.execute(client);
    } catch (error) {
        console.error('❌ Voice verification failed:', error);
    }
});

/* =========================
   MESSAGE COUNTER
   ========================= */

client.on('messageCreate', message => {
    if (!message.guild || message.author.bot) {
        return;
    }

    const data = getUser(message.guild.id, message.author.id);

    data.messages += 1;

    saveSpinData();
});

/* =========================
   INTERACTIONS
   ========================= */

client.on('interactionCreate', async interaction => {
    /* ----- BUTTONS ----- */

    if (interaction.isButton()) {
        if (
            interaction.customId !== 'kaxro_spin' &&
            interaction.customId !== 'kaxro_check_spins'
        ) {
            return;
        }

        const data = getUser(
            interaction.guildId,
            interaction.user.id,
        );

        if (interaction.customId === 'kaxro_check_spins') {
            const eligibleSpins =
                Math.floor(data.messages / MESSAGE_GOAL) * 2;

            await interaction.reply({
                content:
                    `📊 **Your Spin Balance**\n\n` +
                    `🎰 Available spins: **${data.spins}**\n` +
                    `💬 Messages: **${data.messages}/${MESSAGE_GOAL}**\n` +
                    `🎁 Message milestones reached: **${eligibleSpins}** spins`,
                ephemeral: true,
            });

            return;
        }

        if (data.spins <= 0) {
            await interaction.reply({
                content:
                    '❌ You do not have any spins.\n' +
                    `💬 Reach **${MESSAGE_GOAL} messages**, then contact staff to receive your spins.`,
                ephemeral: true,
            });

            return;
        }

        data.spins -= 1;
        saveSpinData();

        await interaction.deferReply({ ephemeral: true });

        /* Moving animation: the embed is edited several times. */
        const frames = [
            '🎰 **Spinning** ·',
            '🎰 **Spinning** ··',
            '🎰 **Spinning** ···',
            '🎰 **Spinning** ····',
            '🎰 **Spinning** ·····',
            '🎰 **Spinning** ······',
        ];

        for (const frame of frames) {
            await interaction.editReply({
                content: `${frame}\n\nThe wheel is rolling...`,
            });

            await sleep(180);
        }

        const reward = chooseReward();

        if (reward.name === '+1 Spin') {
            data.spins += 1;
            saveSpinData();
        }

        await interaction.editReply({
            content:
                `🎰 **Spin Complete!**\n\n` +
                `${reward.emoji} You received **${reward.name}**.\n\n` +
                `🎰 Spins remaining: **${data.spins}**`,
        });

        return;
    }

    /* ----- SLASH COMMANDS ----- */

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = client.commands.get(
        interaction.commandName,
    );

    if (!command) {
        return;
    }

    try {
        await command.execute(interaction, null, client);
    } catch (error) {
        console.error(
            `❌ Error in /${interaction.commandName}:`,
            error,
        );

        const message = {
            content:
                '❌ An unexpected error occurred while executing this command.',
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                ...message,
                ephemeral: true,
            }).catch(() => {});
        } else {
            await interaction.reply({
                ...message,
                ephemeral: true,
            }).catch(() => {});
        }
    }
});

client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
});

try {
    await registerCommands();
    await client.login(token);
} catch (error) {
    console.error('❌ Failed to start KaXro:', error);
    process.exit(1);
}
