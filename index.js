import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    Collection,
} from 'discord.js';

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();

const commands = [
    embedBuilder,
    say,
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
            Routes.applicationGuildCommands(
                clientId,
                guildId,
            ),
            {
                body: commandData,
            },
        );

        console.log(
            `✅ Registered commands in guild ${guildId}`,
        );
    } else {
        await rest.put(
            Routes.applicationCommands(clientId),
            {
                body: commandData,
            },
        );

        console.log(
            '✅ Registered global slash commands.',
        );
    }
}

client.once('ready', async () => {
    console.log(
        `✅ KaXro is online as ${client.user.tag}`,
    );

    try {
        await voiceVerification.execute(client);
    } catch (error) {
        console.error(
            '❌ Voice verification failed:',
            error,
        );
    }
});

client.on('interactionCreate', async interaction => {
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
    console.error(
        '❌ Failed to start KaXro:',
        error,
    );
    process.exit(1);
}
