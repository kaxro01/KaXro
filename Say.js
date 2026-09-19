import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a message as KaXro.')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message KaXro should send.')
                .setRequired(true)
                .setMaxLength(2000),
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel to send the message in.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages,
        )
        .setDMPermission(false),

    async execute(interaction) {
        const message = interaction.options
            .getString('message', true);

        const channel =
            interaction.options.getChannel('channel') ||
            interaction.channel;

        if (!channel) {
            return interaction.reply({
                content: '❌ I could not find a channel to send the message.',
                ephemeral: true,
            });
        }

        const permissions = channel.permissionsFor(
            interaction.guild.members.me,
        );

        if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                content:
                    `❌ I don't have permission to send messages in ${channel}.`,
                ephemeral: true,
            });
        }

        try {
            await channel.send({
                content: message,
                allowedMentions: {
                    parse: [],
                },
            });

            await interaction.reply({
                content: `✅ Message sent in ${channel}.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Say command error:', error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ I could not send the message.',
                    ephemeral: true,
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: '❌ I could not send the message.',
                    ephemeral: true,
                }).catch(() => {});
            }
        }
    },
};
