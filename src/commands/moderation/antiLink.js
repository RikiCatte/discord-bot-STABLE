const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const linkSchema = require("../../schemas/antiLink");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("anti-link")
        .setDescription("Setup or disable the anti-link system")
        .addSubcommand(subcommand =>
            subcommand.setName("setup")
                .setDescription("Setup the anti-link system to delete all links")
                .addStringOption(option => option.setName("permissions").setRequired(true).setDescription("Choose the permissions to BYPASS the anti link system")
                    .addChoices(
                        { name: "Manage Channels", value: "ManageChannels" },
                        { name: "Manage Server", value: "ManageGuild" },
                        { name: "Embed Links", value: "EmbedLinks" },
                        { name: "Attach Files", value: "AttachFiles" },
                        { name: "ManageMessages", value: "ManageMessages" },
                        { name: "Administrator", value: "Administrator" }
                    )
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName("disable")
                .setDescription("Disable the anti-link system")
        )
        .addSubcommand(subcommand =>
            subcommand.setName("check")
                .setDescription("Check the status of the anti-link system")
        )
        .addSubcommand(subcommand =>
            subcommand.setName("edit")
                .setDescription("Edit your anti-link permissions")
                .addStringOption(option => option.setName("permissions").setRequired(true).setDescription("Choose the permissions to BYPASS the anti link system")
                    .addChoices(
                        { name: "Manage Channels", value: "ManageChannels" },
                        { name: "Manage Server", value: "ManageGuild" },
                        { name: "Embed Links", value: "EmbedLinks" },
                        { name: "Attach Files", value: "AttachFiles" },
                        { name: "ManageMessages", value: "ManageMessages" },
                        { name: "Administrator", value: "Administrator" }
                    )
                )
        )
        .toJSON(),
    userPermissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],

    run: async (client, interaction) => {
        var data, permissions, embed;
        const { options } = interaction;

        const sub = options.getSubcommand();

        switch (sub) {
            case "setup":
                permissions = options.getString("permissions");

                data = await linkSchema.findOne({ Guild: interaction.guild.id });

                if (data) return await interaction.reply({ content: "This server already has an anti-link system enabled, do /anti-link disable to remove it", ephemeral: true });

                if (!data) {
                    linkSchema.create({
                        Guild: interaction.guild.id,
                        Permissions: permissions
                    })
                }

                embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`\`✅\` The anti-link system has been enabled for this server using the permissions: ${permissions} to bypass the system`)

                await interaction.reply({ embeds: [embed], ephemeral: true });

                break;
            case "disable":
                await linkSchema.deleteMany();

                embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`✅ The anti-link system has been disabled for this server`)

                await interaction.reply({ embeds: [embed], ephemeral: true });

                break;
            case "check":
                data = await linkSchema.findOne({ Guild: interaction.guild.id });

                if (!data) return await interaction.reply({ content: "This server does not have an anti-link system enabled", ephemeral: true });

                permissions = data.Permissions;

                if (!permissions) return await interaction.reply({ content: "This server does not have an anti-link system enabled", ephemeral: true });

                await interaction.reply({ content: `The anti-link system has currently set up for this server. People with the **${permissions}** permissions can bypass the system`, ephemeral: true });

                break;
            case "edit":
                data = await linkSchema.findOne({ Guild: interaction.guild.id });
                permissions = options.getString("permissions");

                if (!data) return await interaction.reply({ content: "This server does not have an anti-link system enabled", ephemeral: true });

                await linkSchema.deleteMany();

                await linkSchema.create({
                    Guild: interaction.guild.id,
                    Permissions: permissions
                })

                embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`✅ Your anti-link bypass permissions have been set to: ${permissions} for this server`)

                await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}