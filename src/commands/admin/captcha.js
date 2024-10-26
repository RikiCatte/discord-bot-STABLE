const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require("discord.js");
const captchaSchema = require("../../schemas/captchaSetup");
const { secsToMs } = require("../../utils/timeUtils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("captcha")
        .setDescription("Setup the CAPTCHA verification system")
        .addSubcommand(command =>
            command
                .setName("setup")
                .setDescription("Setup the CAPTCHA verification system")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role you want to be given on verification")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("limit")
                        .setDescription("The number of times that one user can rejoin the server")
                        .setRequired(true)
                )
                .addStringOption((o) =>
                    o
                        .setName("time")
                        .setDescription("The time to make automatically expire the CAPTCHA.")
                        .setChoices(
                            { name: "60 Seconds", value: `${60}` },
                            { name: "5 Minutes", value: `${60 * 5}` },
                            { name: "10 Minutes", value: `${60 * 10}` },
                            { name: "1 Hour", value: `${60 * 60}` },
                            { name: "1 Day", value: `${60 * 60 * 24}` }
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("text")
                        .setDescription("The CAPTCHA text you want in the CAPTCHA image, leave empty to generate a random text every time")
                        .setRequired(false)
                )
        )
        .addSubcommand(command => command.setName("disable").setDescription("Disable the CAPTCHA verification system"))
        .toJSON(),
    userPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    /**
     * 
     * @param {Client} client 
     * @param {ChatInputCommandInteraction} interaction 
     * @returns 
     */
    run: async (client, interaction) => {
        const data = await captchaSchema.findOne({ Guild: interaction.guild.id });

        const { options } = interaction;
        const subcommand = options.getSubcommand();

        switch (subcommand) {
            case "setup":

                if (data) return await interaction.reply({ content: "The captcha system is already on!", ephemeral: true });
                const role = options.getRole("role");
                const limit = options.getInteger("limit");
                let time = options.getString("time");
                let msecs = await secsToMs(time); // time in milliseconds

                let captchaText = options.getString("text"), random = false;
                if (!captchaText) {
                    captchaText = "Random"; random = true;
                }

                await captchaSchema.create({
                    Guild: interaction.guild.id,
                    Role: role.id,
                    ReJoinLimit: limit,
                    RandomText: random,
                    ExpireInMS: msecs,
                    Captcha: captchaText
                })

                const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`\`✅\` The captcha system has been **set!**`)

                await interaction.reply({ embeds: [embed], ephemeral: true });

                break;
            case "disable":
                if (!data) return await interaction.reply({ content: "There is no captcha verification system set here!", ephemeral: true });

                await captchaSchema.deleteMany({ Guild: interaction.guild.id });

                const embed_ = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`\`✅\` The captcha system has been **disabled!**`)

                await interaction.reply({ embeds: [embed_], ephemeral: true });
        }
    }
}