import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';

const MAX_FIELDS = 25;
const IDLE_TIMEOUT = 5 * 60 * 1000;

const COLORS = [
    { label: 'Primary Blue', value: '#336699' },
    { label: 'Success Green', value: '#57F287' },
    { label: 'Error Red', value: '#ED4245' },
    { label: 'Warning Yellow', value: '#FEE75C' },
    { label: 'Info Blue', value: '#3498DB' },
    { label: 'Discord Blurple', value: '#5865F2' },
    { label: 'Fuchsia', value: '#EB459E' },
    { label: 'Gold', value: '#F1C40F' },
    { label: 'White', value: '#FFFFFF' },
    { label: 'Dark', value: '#202225' },
    { label: 'Custom Hex', value: 'custom' },
];

function isValidUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isValidHex(value) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function hexToNumber(hex) {
    return parseInt(hex.replace('#', ''), 16);
}

function getColor(hex) {
    if (isValidHex(hex)) {
        return hexToNumber(hex);
    }

    return 0x5865F2;
}

function createState() {
    return {
        title: '',
        description: '',
        color: '#5865F2',
        author: null,
        footer: null,
        thumbnail: null,
        image: null,
        timestamp: false,
        fields: [],
    };
}

function buildPreview(state) {
    const embed = new EmbedBuilder()
        .setColor(getColor(state.color));

    if (state.title) {
        embed.setTitle(state.title.slice(0, 256));
    }

    if (state.description) {
        embed.setDescription(state.description.slice(0, 4096));
    }

    if (state.author?.name) {
        const author = {
            name: state.author.name.slice(0, 256),
        };

        if (state.author.iconUrl && isValidUrl(state.author.iconUrl)) {
            author.iconURL = state.author.iconUrl;
        }

        if (state.author.url && isValidUrl(state.author.url)) {
            author.url = state.author.url;
        }

        embed.setAuthor(author);
    }

    if (state.footer?.text) {
        const footer = {
            text: state.footer.text.slice(0, 2048),
        };

        if (state.footer.iconUrl && isValidUrl(state.footer.iconUrl)) {
            footer.iconURL = state.footer.iconUrl;
        }

        embed.setFooter(footer);
    }

    if (state.thumbnail && isValidUrl(state.thumbnail)) {
        embed.setThumbnail(state.thumbnail);
    }

    if (state.image && isValidUrl(state.image)) {
        embed.setImage(state.image);
    }

    if (state.timestamp) {
        embed.setTimestamp();
    }

    if (state.fields.length) {
        embed.addFields(state.fields);
    }

    if (
        !state.title &&
        !state.description &&
        !state.author?.name &&
        !state.footer?.text &&
        !state.thumbnail &&
        !state.image &&
        !state.fields.length
    ) {
        embed.setDescription(
            '*(Empty embed — use the buttons below to add content.)*',
        );
    }

    return embed;
}

function buildDashboard(state) {
    const shorten = (text, length = 40) => {
        if (!text) return 'Not set';

        return text.length > length
            ? `${text.slice(0, length)}…`
            : text;
    };

    return new EmbedBuilder()
        .setTitle('🛠️ Embed Builder')
        .setDescription(
            [
                `**Title:** ${state.title ? `\`${shorten(state.title)}\`` : '`Not set`'}`,
                `**Description:** ${state.description ? `${state.description.length} character(s)` : '`Not set`'}`,
                `**Color:** \`${state.color}\``,
                `**Author:** ${state.author?.name ? `\`${shorten(state.author.name, 30)}\`` : '`Not set`'}`,
                `**Footer:** ${state.footer?.text ? `\`${shorten(state.footer.text, 30)}\`` : '`Not set`'}`,
                `**Thumbnail:** ${state.thumbnail ? '✅ Set' : '`Not set`'}`,
                `**Image:** ${state.image ? '✅ Set' : '`Not set`'}`,
                `**Timestamp:** ${state.timestamp ? '✅ Enabled' : '`Disabled`'}`,
                `**Fields:** ${state.fields.length}/${MAX_FIELDS}`,
            ].join('\n'),
        )
        .setColor(getColor(state.color))
        .setFooter({
            text: 'KaXro Embed Builder • Session expires after 5 minutes',
        });
}

function buildButtons(state) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eb_content')
            .setLabel('Edit Content')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('eb_author')
            .setLabel('Author')
            .setEmoji('👤')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('eb_footer')
            .setLabel('Footer')
            .setEmoji('📄')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('eb_color')
            .setLabel('Color')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eb_images')
            .setLabel('Images')
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('eb_add_field')
            .setLabel('Add Field')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(state.fields.length >= MAX_FIELDS),

        new ButtonBuilder()
            .setCustomId('eb_edit_field')
            .setLabel('Edit Field')
            .setEmoji('📝')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(state.fields.length === 0),

        new ButtonBuilder()
            .setCustomId('eb_remove_field')
            .setLabel('Remove Field')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(state.fields.length === 0),
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eb_timestamp')
            .setLabel(
                state.timestamp
                    ? 'Disable Timestamp'
                    : 'Enable Timestamp',
            )
            .setEmoji('🕐')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('eb_export')
            .setLabel('JSON / Raw Data')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('eb_reset')
            .setLabel('Reset')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId('eb_post')
            .setLabel('Post Embed')
            .setEmoji('📤')
            .setStyle(ButtonStyle.Success),
    );

    return [row1, row2, row3];
     }

function applyValue(input, value) {
    if (value !== undefined && value !== null && String(value).length > 0) {
        input.setValue(String(value));
    }
    return input;
}

function buildContentModal(state) {
    return new ModalBuilder()
        .setCustomId('eb_modal_content')
        .setTitle('Edit Embed Content')
        .addComponents(
            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('title')
                        .setLabel('Title')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('My Embed')
                        .setMaxLength(256)
                        .setRequired(false),
                    state.title,
                ),
            ),

            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Description')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Write your embed description...')
                        .setMaxLength(4000)
                        .setRequired(false),
                    state.description,
                ),
            ),
        );
}

function buildAuthorModal(state) {
    return new ModalBuilder()
        .setCustomId('eb_modal_author')
        .setTitle('Edit Author')
        .addComponents(
            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Author Name')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(256)
                        .setRequired(false),
                    state.author?.name,
                ),
            ),

            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('icon')
                        .setLabel('Author Icon URL')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                    state.author?.iconUrl,
                ),
            ),

            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('url')
                        .setLabel('Author Link URL')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                    state.author?.url,
                ),
            ),
        );
}

function buildFooterModal(state) {
    return new ModalBuilder()
        .setCustomId('eb_modal_footer')
        .setTitle('Edit Footer')
        .addComponents(
            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('text')
                        .setLabel('Footer Text')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(2048)
                        .setRequired(false),
                    state.footer?.text,
                ),
            ),

            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('icon')
                        .setLabel('Footer Icon URL')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                    state.footer?.iconUrl,
                ),
            ),
        );
}

function buildFieldModal(state, index = null) {
    const field = index !== null
        ? state.fields[index]
        : null;

    return new ModalBuilder()
        .setCustomId(
            index === null
                ? 'eb_modal_add_field'
                : `eb_modal_edit_field_${index}`,
        )
        .setTitle(
            index === null
                ? 'Add Field'
                : `Edit Field #${index + 1}`,
        )
        .addComponents(
            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Field Name')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(256)
                        .setRequired(true),
                    field?.name,
                ),
            ),

            new ActionRowBuilder().addComponents(
                applyValue(
                    new TextInputBuilder()
                        .setCustomId('value')
                        .setLabel('Field Value')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(1024)
                        .setRequired(true),
                    field?.value,
                ),
            ),

            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('inline')
                    .setLabel('Inline? Type yes or no')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(3)
                    .setRequired(false)
                    .setPlaceholder('no')
                    .setValue(field?.inline ? 'yes' : 'no'),
            ),
        );
}

function buildFieldSelect(state, customId) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder('Choose a field...')
            .addOptions(
                state.fields.map((field, index) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(
                            `${index + 1}. ${field.name}`.slice(0, 100),
                        )
                        .setDescription(
                            field.value.slice(0, 100),
                        )
                        .setValue(String(index)),
                ),
            ),
    );
}

async function refresh(interaction, state) {
    await interaction.editReply({
        embeds: [
            buildPreview(state),
            buildDashboard(state),
        ],
        components: buildButtons(state),
    });
}

async function errorReply(interaction, message) {
    const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`❌ ${message}`);

    if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        }).catch(() => {});
    }

    return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
    }).catch(() => {});
}

async function handleContent(interaction, state) {
    await interaction.showModal(
        buildContentModal(state),
    );

    const submitted = await interaction
        .awaitModalSubmit({
            filter: i =>
                i.customId === 'eb_modal_content' &&
                i.user.id === interaction.user.id,
            time: 120000,
        })
        .catch(() => null);

    if (!submitted) return;

    state.title =
        submitted.fields
            .getTextInputValue('title')
            .trim();

    state.description =
        submitted.fields
            .getTextInputValue('description')
            .trim();

    await submitted.deferUpdate();
}

async function handleAuthor(interaction, state) {
    await interaction.showModal(
        buildAuthorModal(state),
    );

    const submitted = await interaction
        .awaitModalSubmit({
            filter: i =>
                i.customId === 'eb_modal_author' &&
                i.user.id === interaction.user.id,
            time: 120000,
        })
        .catch(() => null);

    if (!submitted) return;

    const name =
        submitted.fields
            .getTextInputValue('name')
            .trim();

    const icon =
        submitted.fields
            .getTextInputValue('icon')
            .trim();

    const url =
        submitted.fields
            .getTextInputValue('url')
            .trim();

    if (icon && !isValidUrl(icon)) {
        await errorReply(
            submitted,
            'The author icon must be a valid HTTP/HTTPS URL.',
        );
        return;
    }

    if (url && !isValidUrl(url)) {
        await errorReply(
            submitted,
            'The author URL must be a valid HTTP/HTTPS URL.',
        );
        return;
    }

    state.author = name
        ? {
            name,
            iconUrl: icon || null,
            url: url || null,
        }
        : null;

    await submitted.deferUpdate();
}

async function handleFooter(interaction, state) {
    await interaction.showModal(
        buildFooterModal(state),
    );

    const submitted = await interaction
        .awaitModalSubmit({
            filter: i =>
                i.customId === 'eb_modal_footer' &&
                i.user.id === interaction.user.id,
            time: 120000,
        })
        .catch(() => null);

    if (!submitted) return;

    const text =
        submitted.fields
            .getTextInputValue('text')
            .trim();

    const icon =
        submitted.fields
            .getTextInputValue('icon')
            .trim();

    if (icon && !isValidUrl(icon)) {
        await errorReply(
            submitted,
            'The footer icon must be a valid HTTP/HTTPS URL.',
        );
        return;
    }

    state.footer = text
        ? {
            text,
            iconUrl: icon || null,
        }
        : null;

    await submitted.deferUpdate();
}

async function handleAddField(interaction, state) {
    if (state.fields.length >= MAX_FIELDS) {
        await errorReply(
            interaction,
            `You can only have ${MAX_FIELDS} fields.`,
        );
        return;
    }

    await interaction.showModal(
        buildFieldModal(state),
    );

    const submitted = await interaction
        .awaitModalSubmit({
            filter: i =>
                i.customId === 'eb_modal_add_field' &&
                i.user.id === interaction.user.id,
            time: 120000,
        })
        .catch(() => null);

    if (!submitted) return;

    const name =
        submitted.fields
            .getTextInputValue('name')
            .trim();

    const value =
        submitted.fields
            .getTextInputValue('value')
            .trim();

    const inline =
        submitted.fields
            .getTextInputValue('inline')
            .trim()
            .toLowerCase() === 'yes';

    state.fields.push({
        name,
        value,
        inline,
    });

    await submitted.deferUpdate();
}
async function handleEditField(interaction, state) {
    if (!state.fields.length) {
        await errorReply(interaction, 'There are no fields to edit.');
        return;
    }

    await interaction.reply({
        content: '📝 Select the field you want to edit:',
        components: [
            buildFieldSelect(state, 'eb_edit_field_select'),
        ],
        flags: MessageFlags.Ephemeral,
    });

    const selectionMessage = await interaction.fetchReply().catch(() => null);
    if (!selectionMessage) return;

    const select = await selectionMessage
        .awaitMessageComponent({
            filter: i =>
                i.customId === 'eb_edit_field_select' &&
                i.user.id === interaction.user.id,
            time: 60000,
        })
        .catch(() => null);

    if (!select) return;

    const index = Number(select.values[0]);

    if (!Number.isInteger(index) || !state.fields[index]) {
        await errorReply(select, 'That field no longer exists.');
        return;
    }

    await select.showModal(
        buildFieldModal(state, index),
    );

    const submitted = await select
        .awaitModalSubmit({
            filter: i =>
                i.customId === `eb_modal_edit_field_${index}` &&
                i.user.id === interaction.user.id,
            time: 120000,
        })
        .catch(() => null);

    if (!submitted) return;

    const name =
        submitted.fields
            .getTextInputValue('name')
            .trim();

    const value =
        submitted.fields
            .getTextInputValue('value')
            .trim();

    const inline =
        submitted.fields
            .getTextInputValue('inline')
            .trim()
            .toLowerCase() === 'yes';

    state.fields[index] = {
        name,
        value,
        inline,
    };

    await submitted.update({
        content: '✅ Field updated.',
        components: [],
    });

    await refresh(interaction, state);
}

async function handleRemoveField(interaction, state) {
    if (!state.fields.length) {
        await errorReply(interaction, 'There are no fields to remove.');
        return;
    }

    await interaction.reply({
        content: '🗑️ Select the field you want to remove:',
        components: [
            buildFieldSelect(state, 'eb_remove_field_select'),
        ],
        flags: MessageFlags.Ephemeral,
    });

    const selectionMessage = await interaction.fetchReply().catch(() => null);
    if (!selectionMessage) return;

    const select = await selectionMessage
        .awaitMessageComponent({
            filter: i =>
                i.customId === 'eb_remove_field_select' &&
                i.user.id === interaction.user.id,
            time: 60000,
        })
        .catch(() => null);

    if (!select) return;

    const index = Number(select.values[0]);

    if (!Number.isInteger(index) || !state.fields[index]) {
        await errorReply(select, 'That field no longer exists.');
        return;
    }

    state.fields.splice(index, 1);

    await select.update({
        content: '✅ Field removed.',
        components: [],
    });

    await refresh(interaction, state);
}

async function handleColor(interaction, state) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('eb_color_select')
        .setPlaceholder('Choose a color...')
        .addOptions(
            COLORS.map(color =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(color.label)
                    .setValue(color.value),
            ),
        );

    await interaction.reply({
        content: '🎨 Choose an embed color:',
        components: [
            new ActionRowBuilder().addComponents(menu),
        ],
        flags: MessageFlags.Ephemeral,
    });

    const selectionMessage = await interaction.fetchReply().catch(() => null);
    if (!selectionMessage) return;

    const select = await selectionMessage
        .awaitMessageComponent({
            filter: i =>
                i.customId === 'eb_color_select' &&
                i.user.id === interaction.user.id,
            time: 60000,
        })
        .catch(() => null);

    if (!select) return;

    const selected = select.values[0];

    if (selected === 'custom') {
        const modal = new ModalBuilder()
            .setCustomId('eb_modal_color')
            .setTitle('Custom Hex Color')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('hex')
                        .setLabel('Hex Color')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('#5865F2')
                        .setMinLength(7)
                        .setMaxLength(7)
                        .setRequired(true),
                ),
            );

        await select.showModal(modal);

        const submitted = await select
            .awaitModalSubmit({
                filter: i =>
                    i.customId === 'eb_modal_color' &&
                    i.user.id === interaction.user.id,
                time: 60000,
            })
            .catch(() => null);

        if (!submitted) return;

        const hex =
            submitted.fields
                .getTextInputValue('hex')
                .trim();

        if (!isValidHex(hex)) {
            await errorReply(
                submitted,
                'Invalid color. Use the format `#RRGGBB`.',
            );
            return;
        }

        state.color = hex;

        await submitted.update({
            content: `✅ Color changed to \`${hex}\`.`,
            components: [],
        });

        return;
    }

    state.color = selected;

    await select.update({
        content: `✅ Color changed to \`${selected}\`.`,
        components: [],
    });
}

async function handleImages(interaction, state) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('eb_image_select')
        .setPlaceholder('Choose an image option...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Set Thumbnail')
                .setValue('thumbnail')
                .setDescription('Small image in the top-right'),

            new StringSelectMenuOptionBuilder()
                .setLabel('Set Large Image')
                .setValue('image')
                .setDescription('Large image at the bottom'),

            new StringSelectMenuOptionBuilder()
                .setLabel('Clear Thumbnail')
                .setValue('clear_thumbnail'),

            new StringSelectMenuOptionBuilder()
                .setLabel('Clear Large Image')
                .setValue('clear_image'),
        );

    await interaction.reply({
        content: '🖼️ Choose an image option:',
        components: [
            new ActionRowBuilder().addComponents(menu),
        ],
        flags: MessageFlags.Ephemeral,
    });

    const selectionMessage = await interaction.fetchReply().catch(() => null);
    if (!selectionMessage) return;

    const select = await selectionMessage
        .awaitMessageComponent({
            filter: i =>
                i.customId === 'eb_image_select' &&
                i.user.id === interaction.user.id,
            time: 60000,
        })
        .catch(() => null);

    if (!select) return;

    const choice = select.values[0];

    if (choice === 'clear_thumbnail') {
        state.thumbnail = null;

        await select.update({
            content: '✅ Thumbnail removed.',
            components: [],
        });

        return;
    }

    if (choice === 'clear_image') {
        state.image = null;

        await select.update({
            content: '✅ Large image removed.',
            components: [],
        });

        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`eb_modal_${choice}`)
        .setTitle(
            choice === 'thumbnail'
                ? 'Set Thumbnail'
                : 'Set Large Image',
        )
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('url')
                    .setLabel('Image URL')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(
                        'https://example.com/image.png',
                    )
                    .setRequired(true),
            ),
        );

    await select.showModal(modal);

    const submitted = await select
        .awaitModalSubmit({
            filter: i =>
                i.customId === `eb_modal_${choice}` &&
                i.user.id === interaction.user.id,
            time: 60000,
        })
        .catch(() => null);

    if (!submitted) return;

    const url =
        submitted.fields
            .getTextInputValue('url')
            .trim();

    if (!isValidUrl(url)) {
        await errorReply(
            submitted,
            'Please provide a valid HTTP/HTTPS image URL.',
        );
        return;
    }

    if (choice === 'thumbnail') {
        state.thumbnail = url;
    } else {
        state.image = url;
    }

    await submitted.update({
        content: '✅ Image updated.',
        components: [],
    });
}

function createRawData(state) {
    return JSON.stringify(
        {
            title: state.title || null,
            description: state.description || null,
            color: state.color,
            author: state.author,
            footer: state.footer,
            thumbnail: state.thumbnail,
            image: state.image,
            timestamp: state.timestamp,
            fields: state.fields,
        },
        null,
        2,
    );
}

async function handleExport(interaction, state) {
    const raw = createRawData(state);

    if (raw.length <= 1900) {
        await interaction.reply({
            content: `\`\`\`json\n${raw}\n\`\`\``,
            flags: MessageFlags.Ephemeral,
        });
    } else {
        await interaction.reply({
            content:
                '📋 The JSON data is too large to display in Discord.',
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function handlePost(interaction, state) {
    await interaction.deferUpdate();

    await interaction.channel.send({
        embeds: [buildPreview(state)],
    });
}

async function handleReset(interaction, state) {
    state.title = '';
    state.description = '';
    state.color = '#5865F2';
    state.author = null;
    state.footer = null;
    state.thumbnail = null;
    state.image = null;
    state.timestamp = false;
    state.fields = [];

    await interaction.deferUpdate();
}
export default {
    data: new SlashCommandBuilder()
        .setName('embedbuilder')
        .setDescription('Create a Discord embed with an interactive builder.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages,
        )
        .setDMPermission(false),

    async execute(interaction) {
        const state = createState();

        await interaction.reply({
            embeds: [
                buildPreview(state),
                buildDashboard(state),
            ],
            components: buildButtons(state),
            flags: MessageFlags.Ephemeral,
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            time: IDLE_TIMEOUT,
            filter: component =>
                component.user.id === interaction.user.id,
        });

        collector.on('collect', async component => {
            try {
                collector.resetTimer();

                switch (component.customId) {
                    case 'eb_content':
                        await handleContent(component, state);
                        break;

                    case 'eb_author':
                        await handleAuthor(component, state);
                        break;

                    case 'eb_footer':
                        await handleFooter(component, state);
                        break;

                    case 'eb_color':
                        await handleColor(component, state);
                        break;

                    case 'eb_images':
                        await handleImages(component, state);
                        break;

                    case 'eb_add_field':
                        await handleAddField(component, state);
                        break;

                    case 'eb_edit_field':
                        await handleEditField(component, state);
                        break;

                    case 'eb_remove_field':
                        await handleRemoveField(component, state);
                        break;

                    case 'eb_timestamp':
                        state.timestamp = !state.timestamp;
                        await component.deferUpdate();
                        break;

                    case 'eb_export':
                        await handleExport(component, state);
                        return;

                    case 'eb_reset':
                        await handleReset(component, state);
                        break;

                    case 'eb_post':
                        await handlePost(component, state);
                        break;

                    default:
                        return;
                }

                await refresh(interaction, state);
            } catch (error) {
                console.error(
                    'Embed Builder interaction error:',
                    error,
                );

                await errorReply(
                    component,
                    'Something went wrong while using the Embed Builder.',
                );
            }
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply({
                    components: [],
                });
            } catch {
                // Message may already be deleted or unavailable.
            }
        });
    },
};
