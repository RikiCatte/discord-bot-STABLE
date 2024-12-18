const { EmbedBuilder, Events, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const msgConfig = require("../messageConfig.json");
const serverStatsCategoryId = msgConfig.serverStats_Category;
const riskyLogsSchema = require("../schemas/riskyLogs");
const susUserSchema = require("../schemas/suspiciousUserJoin");

// Function to get differences between 2 objects
function getDifferences(obj1, obj2) {
    const differences = {};

    // Populate array with old and new properties
    for (const key in obj1) {
        if (obj1[key] !== obj2[key]) {
            if (key === 'permissions') {
                const oldPermissions = obj1[key].toArray();
                const newPermissions = obj2[key].toArray();
                if (oldPermissions.join(',') !== newPermissions.join(',')) { // Won't log useless formatting chars
                    differences[key] = {
                        oldValue: oldPermissions,
                        newValue: newPermissions
                    };
                }
            } else if (key === 'flags') {
                const oldFlags = obj1[key].toArray();
                const newFlags = obj2[key].toArray();
                if (oldFlags.join(',') !== newFlags.join(',')) {
                    differences[key] = {
                        oldValue: oldFlags,
                        newValue: newFlags
                    };
                }
            } else {
                differences[key] = {
                    oldValue: obj1[key],
                    newValue: obj2[key]
                };
            }
        }
    }

    // Find differences between obj1 and obj2
    for (const key in obj2) {
        if (!(key in obj1)) {
            differences[key] = {
                oldValue: undefined,
                newValue: obj2[key]
            };
        }
    }

    return differences; // Array that contains ONLY the differences between 2 objects
}

module.exports = (client) => {
    // Sends the Log in the channel (channel ID inside .json file)
    async function sendLog(embed, raidRisk, channelId, logTitle) {
        const staffChannel = client.channels.cache.get(`${msgConfig.staffChannel}`);
        const LogChannel = client.channels.cache.get(`${msgConfig.logsChannel}`);

        if (!LogChannel || !staffChannel)
            return console.log("[LOGGING SYSTEM][ERROR] Error with ChannelID, check .json file!".red);

        embed.setFooter({ text: "Mod Logging System by RikiCatte", iconURL: msgConfig.footer_iconURL });
        embed.setTimestamp();

        try {
            await LogChannel.send({ embeds: [embed] });

            const date = new Date();
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;

            if (raidRisk) {
                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`logSystem`)
                            .setStyle(ButtonStyle.Success)
                            .setLabel("✅ Mark as Solved")
                    )

                let msg = await staffChannel.send({ content: `@here Please pay attention!`, embeds: [embed], components: [button] });

                await riskyLogsSchema.create({
                    RiskyLogID: msg.id,
                    ChannelID: channelId,
                    Guild: msg.guildId,
                    Title: logTitle,
                    Date: formattedDate,
                    Solved: false,
                }).catch((err) => console.log(err));
            }

            return;
        } catch (err) {
            console.log(err);
            return await LogChannel.send("Error occured with: " + embed);
        }
    }

    /* 
    Emitted whenever permissions for an application command in a guild were updated. 
    This includes permission updates for other applications in addition to the logged in client,
    check data.applicationId to verify which application the update is for
    */
    client.on(Events.ApplicationCommandPermissionsUpdate, (data) => {
        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("\`🟡\` Permissions for an application command has been updated")
            .addFields({ name: "Application ID", value: `${data.applicationId}`, inline: true })
            .addFields({ name: "Updated Command / Global Entity ID", value: `${data.id}`, inline: true })
            .addFields({ name: "Role / USer / Channel ID [Has Permission]", value: `${data.permissions.id} [${data.permissions.permission}]`, inline: false })
            .addFields({ name: "Type", value: `Permission is for ${data.permissions.type}`, inline: true })
            .addFields({ name: "Risk", value: msgConfig.moderateRisk })

        return sendLog(embed);
    })

    // Emitted whenever an auto moderation rule is triggered. This event requires the PermissionFlagsBits permission.
    client.on(Events.AutoModerationActionExecution, (automodAction) => {
        let title = "\`🟣\` AutoModeration Action Triggered"

        const embed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle(title)
            .addFields({ name: "Action Type", value: `${automodRule.actions[0].type}`, inline: true })
            .addFields({ name: "Channel", value: `${automodAction.channel} (${automodAction.channelId})`, inline: false })
            .addFields({ name: "Content", value: `${automodAction.content}`, inline: true })
            .addFields({ name: "Matched Content", value: `${automodAction.matchedContent}`, inline: true })
            .addFields({ name: "Matched Keyword", value: `${automodAction.matchedKeyword}`, inline: true })
            .addFields({ name: "Triggered By", value: `${automodAction.member} (${automodAction.member.id})`, inline: false })
            .addFields({ name: "Message ID", value: `${automodAction.messageId}`, inline: true })
            .addFields({ name: "Rule ID", value: `${automodAction.ruleId}`, inline: true })
            .addFields({ name: "Rule Trigger Type", value: `${automodAction.ruleTriggerType}`, inline: true })
            .addFields({ name: "User", value: `${automodAction.user} (${automodAction.userId})`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.raidRisk })

        return sendLog(embed, true, automodAction.channelId, title);
    })


    // Emitted whenever an auto moderation rule is created. This event requires the PermissionFlagsBits permission.
    client.on(Events.AutoModerationRuleCreate, (automodRule) => {
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("\`🟢\` New AutoMod Rule Created")
            .addFields({ name: "Name", value: `${automodRule.name}`, inline: false })
            .addFields({ name: "Rule ID", value: `${automodRule.id}`, inline: false })
            .addFields({ name: "Created By", value: `<@${automodRule.creatorId}> (${automodRule.creatorId})`, inline: false })
            .addFields({ name: "Action Type", value: `${automodRule.actions[0].type} (1: BlockMsg, 2: SendAlertMsg, 3: MemberTimeout)`, inline: false })
            .addFields({ name: "Enabled?", value: `\`${automodRule.enabled}\``, inline: false })
            .addFields({ name: "Event Type", value: `${automodRule.eventType} (1: MessageSend)`, inline: false })
            .addFields({ name: "Keyword Filter", value: `${automodRule.triggerMetadata.keywordFilter}` || "None", inline: false })
            .addFields({ name: "Mention Raid Protection?", value: `\`${automodRule.triggerMetadata.mentionRaidProtectionEnabled}\``, inline: false })
            .addFields({ name: "Total Mention Limit", value: `${automodRule.triggerMetadata.mentionTotalLimit}`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.lowRisk })

        return sendLog(embed);
    })

    // Emitted whenever an auto moderation rule is deleted. This event requires the PermissionFlagsBits permission. //Fixare errore console
    client.on(Events.AutoModerationRuleDelete, (automodRule) => {
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("\`🔴\` AutoMod Rule Deleted")
            .addFields({ name: "Name", value: `${automodRule.name}`, inline: false })
            .addFields({ name: "Rule ID", value: `${automodRule.id}`, inline: false })
            .addFields({ name: "Created By", value: `<@${automodRule.creatorId}> (${automodRule.creatorId})`, inline: false })
            .addFields({ name: "Action Type", value: `${automodRule.actions.type} (1: BlockMsg, 2: SendAlertMsg, 3: MemberTimeout)`, inline: false })
            .addFields({ name: "Enabled?", value: `\`${automodRule.enabled}\``, inline: false })
            .addFields({ name: "Event Type", value: `${automodRule.eventType} (1: MessageSend)`, inline: false })
            .addFields({ name: "Keyword Filter", value: `${automodRule.triggerMetadata.keywordFilter}` || "None", inline: false })
            .addFields({ name: "Mention Raid Protection?", value: `\`${automodRule.triggerMetadata.mentionRaidProtectionEnabled}\``, inline: false })
            .addFields({ name: "Total Mention Limit", value: `${automodRule.triggerMetadata.mentionTotalLimit}`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.highRisk })

        return sendLog(embed)
    })

    // Emitted whenever an auto moderation rule gets updated. This event requires the PermissionFlagsBits permission. //Fixare errore console
    client.on(Events.AutoModerationRuleUpdate, (oldAutoModRule, newAutoModRule) => {
        // Get Differences between roles using function at the top of file     
        const differences = getDifferences(oldAutoModRule, newAutoModRule);

        // Building the embed
        const embed = new EmbedBuilder()
            .setTitle(`\`🟡\` Automod rule ${newAutoModRule.name} has been modified`)
            .setDescription("The following changes have been made to automod rule:")
            .setColor("Yellow")
            .addFields({ name: "ID", value: newAutoModRule.id, inline: true })
            .addFields({ name: "Name", value: `<@${newAutoModRule.id}> (${newAutoModRule.name})`, inline: true })

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            //if (key != "_roles") // Won't log useless changes
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.moderateRisk, inline: false })
        return sendLog(embed);
    })

    // Cache Sweep
    // client.on(Events.CacheSweep, (message) => {
    //     const embed = new EmbedBuilder()
    //         .setColor("Yellow")
    //         .setTitle("\`🟡\` Cache Sweeped")

    //     // return sendLog(embed);
    // })

    // Emitted whenever a guild channel is created.
    client.on(Events.ChannelCreate, async (channel) => {
        channel.guild
            .fetchAuditLogs({ type: AuditLogEvent.ChannelCreate })
            .then(async (audit) => {
                const { executor } = audit.entries.first();

                const name = channel.name;
                const id = channel.id;
                let type = channel.type;

                if (type == 0) type = "Text";
                if (type == 2) type = "Voice";
                if (type == 13) type = "Stage";
                if (type == 15) type = "Form";
                if (type == 5) type = "Announcement";
                if (type == 4) type = "Category";

                const embed = new EmbedBuilder()
                    .setTitle("\`🟢\` Channel has been Created")
                    .setColor("Green")
                    .addFields({ name: "Channel Name", value: `${name} (<#${id}>)`, inline: false, })
                    .addFields({ name: "Channel Type", value: `${type}`, inline: false })
                    .addFields({ name: "Channel ID", value: `${id}`, inline: false })
                    .addFields({ name: "Created By", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                    .addFields({ name: "Risk", value: msgConfig.lowRisk })

                return sendLog(embed);
            })
    }
    );

    // Emitted whenever a channel is deleted.
    client.on(Events.ChannelDelete, async (channel) => {
        channel.guild
            .fetchAuditLogs({ type: AuditLogEvent.ChannelDelete })
            .then(async (audit) => {
                const { executor } = audit.entries.first();

                const name = channel.name;
                const id = channel.id;
                let type = channel.type;

                if (type == 0) type = "Text";
                if (type == 2) type = "Voice";
                if (type == 13) type = "Stage";
                if (type == 15) type = "Form";
                if (type == 5) type = "Announcement";
                if (type == 4) type = "Category";

                const embed = new EmbedBuilder()
                    .setTitle("\`🟡\` Channel Deleted")
                    .setColor("Yellow")
                    .addFields({ name: "Channel Name", value: `${name}`, inline: false })
                    .addFields({ name: "Channel Type", value: `${type}`, inline: false })
                    .addFields({ name: "Channel ID", value: `${id}`, inline: false })
                    .addFields({ name: "Deleted By", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                    .addFields({ name: "Risk", value: msgConfig.moderateRisk })

                return sendLog(embed);
            });
    });

    /*
    Emitted whenever the pins of a channel are updated. Due to the nature of the WebSocket event, 
    not much information can be provided easily here - you need to manually check the pins yourself.
    */
    client.on(Events.ChannelPinsUpdate, (channel, date) => {
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🟢\` New Pinned Message in ${channel}`)
            .addFields({ name: "Risk", value: msgConfig.lowRisk })

        return sendLog(embed);
    })

    // Emitted whenever a channel is updated - e.g. name change, topic change, channel type change.
    client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
        // Check if channel is under server stats category (we don't want these channels be logged when modified)
        if (serverStatsCategoryId && newChannel.parent?.id === serverStatsCategoryId) return;

        newChannel.guild
            .fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate })
            .then(async (audit) => {
                const { executor } = audit.entries.first();

                if (!executor || !oldChannel || !newChannel) return;

                const embed = new EmbedBuilder()
                    .setColor("Green")

                // Name has been changed
                if (oldChannel.name !== newChannel.name) {
                    embed.setTitle(`\`🟢\` Channel name of ${newChannel} has been changed!`)
                        .addFields({ name: "Old name", value: oldChannel.name, inline: false })
                        .addFields({ name: "New name", value: newChannel.name, inline: false })
                        .addFields({ name: "Modified by", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                        .addFields({ name: "Risk", value: msgConfig.lowRisk })
                }

                // Topic has been changed
                if (oldChannel.topic !== newChannel.topic) {
                    embed.setTitle(`\`🟢\` Channel topic of ${newChannel} has been changed`)
                        .addFields({ name: "Old topic", value: oldChannel.topic + " ", inline: false, }) // + " " -> to prevent empty string (bot crash) when topic is not set  
                        .addFields({ name: "New topic", value: newChannel.topic + " ", inline: false, }) // + " " -> to prevent empty string (bot crash) when topic is not set  
                        .addFields({ name: "Modified by", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                        .addFields({ name: "Risk", value: msgConfig.lowRisk })
                }

                // Type has been changed
                if (oldChannel.type !== newChannel.type) {
                    embed.setTitle(`\`🟢\` Channel type of ${newChannel} has been changed`)
                        .addFields({ name: "Old type", value: oldChannel.type, inline: false, })
                        .addFields({ name: "New type", value: newChannel.type, inline: false, })
                        .addFields({ name: "Modified by", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                        .addFields({ name: "Risk", value: msgConfig.lowRisk })
                }

                // Part to check Channel Role Changes

                // To know if changes concern user or role
                async function getPermissionTargetType(guild, id) {
                    const member = await guild.members.fetch(id).catch(() => null);
                    if (member) return 'user';

                    const role = await guild.roles.fetch(id).catch(() => null);
                    if (role) return 'role';

                    return null;
                }

                const oldPermissions = oldChannel.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.bitfield,
                    deny: overwrite.deny.bitfield
                }));

                const newPermissions = newChannel.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.bitfield,
                    deny: overwrite.deny.bitfield
                }));

                // Array to store permission changes
                const permissionChanges = [];

                // Check for added permissions
                for (const permission of newPermissions) {
                    if (!oldPermissions.some(oldPermission => oldPermission.id === permission.id && oldPermission.type === permission.type)) {
                        const targetType = await getPermissionTargetType(newChannel.guild, permission.id);
                        permissionChanges.push(`Added ${targetType === 'user' ? 'user' : 'role'} <@${newPermissions.id}> (ID: ${newPermissions.id}) permission added`);
                    }
                }

                // Check for removed permissions
                for (const permission of oldPermissions) {
                    if (!newPermissions.some(newPermission => newPermission.id === permission.id && newPermission.type === permission.type)) {
                        const targetType = await getPermissionTargetType(newChannel.guild, permission.id);
                        permissionChanges.push(`Removed ${targetType === 'user' ? '**user**' : '**role**'} <@${newPermissions.id}> (ID: ${newPermissions.id}) permission removed`);
                    }
                }

                // Check for modified permissions
                for (const oldPermission of oldPermissions) {
                    const newPermission = newPermissions.find(newPerm => newPerm.id === oldPermission.id && newPerm.type === oldPermission.type);
                    if (newPermission && (oldPermission.allow !== newPermission.allow || oldPermission.deny !== newPermission.deny)) {
                        const targetType = await getPermissionTargetType(newChannel.guild, oldPermission.id);
                        permissionChanges.push(`Modified ${targetType === 'user' ? '**user**' : '**role**'} <@${newPermission.id}> (ID: ${newPermission.id}) permission update`);
                    }
                }

                // If there are permission changes, finally add them to the embed
                if (permissionChanges.length > 0) {
                    const permissionChangesString = permissionChanges.join('\n');
                    const embed = new EmbedBuilder()
                        .setTitle(`Permissions Changes of specific channel for User or Role`)
                        .setColor("Green")
                        .addFields({ name: "Channel Name", value: `${newChannel} (${newChannel.name})`, inline: true })
                        .addFields({ name: "Channel ID", value: newChannel.id, inline: true })
                        .addFields({ name: "Permission Changes", value: permissionChangesString, inline: false })
                        .addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false });

                    return sendLog(embed);
                }
            })
    })

    // Emitted for general debugging information.
    // client.on(Events.Debug, async (debug) => {
    //     const embed = new EmbedBuilder()
    //         .setColor("Blue")
    //         .setTitle("🔵 DEBUG")
    //         .addFields({ name: "Text", value: debug, inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // client.on(Events.Error, async (error) => {
    //     const embed = new EmbedBuilder()
    //         .setColor("Blue")
    //         .setTitle("🔵 ERROR")
    //         .addFields({ name: "Text", value: error, inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted whenever a guild audit log entry is created.
    client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
        if (!auditLogEntry || auditLogEntry.action) return;

        let changed;
        if (auditLogEntry.changes.old != auditLogEntry.changes.new)
            changed = true;
        else
            changed = false;

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("\`🔵\` Audit Log Entry Created")
            .addFields({ name: "Action", value: auditLogEntry.action, inline: true })
            .addFields({ name: "Action Type", value: auditLogEntry.actionType, inline: true })
            .addFields({ name: "Does Entry Already Exist?", value: `\`${changed}\``, inline: false })


        return sendLog(embed);
    })

    // Emitted whenever a member is banned from a guild.
    client.on(Events.GuildBanAdd, async (guildBan) => {
        console.log("guildBan: ", guildBan);

        guildBan.guild
            .fetchAuditLogs({ type: AuditLogEvent.GuildBanAdd })
            .then(async (audit) => {
                const { executor } = audit.entries.first();

                const name = guildBan.user.username;
                const id = guildBan.user.id;

                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("\`🔴\` Member Banned")
                    .addFields({ name: "Member Name", value: `${name} (<@${id}>)`, inline: false })
                    .addFields({ name: "Member ID", value: `${id}`, inline: true })
                    .addFields({ name: "Banned By", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                    .addFields({ name: "Reason", value: guildBan.reason || "None", inline: false })
                    .addFields({ name: "Risk", value: msgConfig.highRisk })

                return sendLog(embed);
            });
    });

    // Emitted whenever a member is unbanned from a guild.
    client.on(Events.GuildBanRemove, async (guildBan) => {
        guildBan.guild
            .fetchAuditLogs({ type: AuditLogEvent.GuildBanRemove })
            .then(async (audit) => {
                const { executor } = audit.entries.first();

                const name = guildBan.user.username;
                const id = guildBan.user.id;

                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("\`🔴\` Member Unbanned")
                    .addFields({ name: "Member Name", value: `${name} (<@${id}>)`, inline: false })
                    .addFields({ name: "Member ID", value: `${id}`, inline: false })
                    .addFields({ name: "Unbanned By", value: `<@${executor.id}> (${executor.tag})`, inline: false })
                    .addFields({ name: "Reason", value: guildBan.reason || "None", inline: false })
                    .addFields({ name: "Risk", value: msgConfig.highRisk })

                return sendLog(embed);
            });
    });

    // Emitted whenever a new emoji is created from a guild.
    client.on(Events.GuildEmojiCreate, async (createdEmoji) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = createdEmoji.createdAt.toLocaleString('en-US', options);

        const author = await createdEmoji.fetchAuthor();

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` New Server Emoji Created: ${createdEmoji.name}`)
            .addFields({ name: "Animated?", value: `\`${createdEmoji.animated}\``, inline: true })
            .addFields({ name: "Available?", value: `\`${createdEmoji.available}\``, inline: true })
            .addFields({ name: "Author", value: `<@${author.id}> (${author.id})` || `\`Unknown\``, inline: true })
            .addFields({ name: "Client", value: (`<@${createdEmoji.client.user.id}> ${(createdEmoji.client.user.id)}`) || `\`Unknown\``, inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: false })
            .addFields({ name: "Deletable?", value: `\`${createdEmoji.deletable}\``, inline: true })
            .addFields({ name: "Managed by Ext. Service?", value: `\`${createdEmoji.managed}\``, inline: true })
            .addFields({ name: "Emoji's Server", value: `${createdEmoji.guild} (${createdEmoji.guild.id})`, inline: false })
            .addFields({ name: "Emoji ID", value: createdEmoji.identifier, inline: true })
            .addFields({ name: "Emoji Name", value: createdEmoji.name, inline: true })
            .addFields({ name: "Emoji URL", value: createdEmoji.imageURL(), inline: true })
            .addFields({ name: "Emoji Preview", value: createdEmoji.toString(), inline: true })
            .addFields({ name: "Risk", value: msgConfig.info })

        return sendLog(embed);
    });

    // Emitted whenever a emoji is deleted from a guild.
    client.on(Events.GuildEmojiDelete, async (deletedEmoji) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = deletedEmoji.createdAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` Server Emoji Deleted: ${deletedEmoji.name}`)
            .addFields({ name: "Client", value: (`<@${deletedEmoji.client.user.id}> ${(deletedEmoji.client.user.id)}`) || `\`Unknown\``, inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: false })
            .addFields({ name: "Emoji's Server", value: `${deletedEmoji.guild} (${deletedEmoji.guild.id})`, inline: false })
            .addFields({ name: "Emoji ID", value: deletedEmoji.identifier, inline: true })
            .addFields({ name: "Emoji Name", value: deletedEmoji.name, inline: true })
            .addFields({ name: "Emoji URL", value: deletedEmoji.imageURL(), inline: true })
            .addFields({ name: "Emoji Preview", value: deletedEmoji.toString(), inline: true })
            .addFields({ name: "Risk", value: msgConfig.info })

        return sendLog(embed);
    })

    // Emitted whenever a existing emoji is modified from a guild.
    client.on(Events.GuildEmojiUpdate, async (oldEmoji, newEmoji) => {
        // Get Differences between roles using function at the top of file     
        const differences = getDifferences(oldEmoji, newEmoji);

        // Building the embed
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Emoji ${newEmoji.name} has been modified`)
            .setDescription("The following changes have been made to emoji:")
            .setColor("Blue")
            .addFields({ name: "Emoji ID", value: newEmoji.id, inline: true })
            .addFields({ name: "Emoji Name", value: `<@${newEmoji.id}> (${newEmoji.name})`, inline: true })

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            if (key != "_roles") // Won't log useless changes
                embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.info, inline: false })
        return sendLog(embed);
    })

    // Emitted whenever guild integrations are updated
    client.on(Events.GuildIntegrationsUpdate, async (guild) => {
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` Server Integrations of ${guild.name} (${guild.id}) has been updated`)
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a user joins a guild.
    client.on(Events.GuildMemberAdd, async (member) => {
        const staffChannel = client.channels.cache.get(`${msgConfig.staffChannel}`);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = member.user.createdAt.toLocaleString('en-US', options);
        const formattedJoinedAt = member.joinedAt.toLocaleString('en-US', options);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` Member **Joined** the Server`)
            .setThumbnail(member.displayAvatarURL())
            .addFields({ name: "Name", value: `${member} (${member.user.username})`, inline: true })
            .addFields({ name: "ID", value: member.id, inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Joined At", value: formattedJoinedAt, inline: true })
            .addFields({ name: "Official Discord System User?", value: `\`${member.user.system}\``, inline: true })
            .addFields({ name: "Kickable?", value: `\`${member.kickable}\``, inline: true })
            .addFields({ name: "Manageable?", value: `\`${member.manageable}\``, inline: true })
            .addFields({ name: "Moderatable?", value: `\`${member.moderatable}\``, inline: true })
            .addFields({ name: "Bot?", value: `\`${member.user.bot}\``, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false });

        await sendLog(embed);

        if (member.user.createdAt > oneMonthAgo) {
            const kickBtn = new ButtonBuilder()
                .setCustomId("kick-sus-user")
                .setLabel("🦶 Kick User")
                .setStyle(ButtonStyle.Danger)

            const banBtn = new ButtonBuilder()
                .setCustomId("ban-sus-user")
                .setLabel("⛔ Ban User")
                .setStyle(ButtonStyle.Danger)

            const cancelBtn = new ButtonBuilder()
                .setCustomId("noaction-sus-user")
                .setLabel("🔰 Do Nothing")
                .setStyle(ButtonStyle.Secondary)

            const row = new ActionRowBuilder().addComponents(kickBtn, banBtn, cancelBtn);

            let result = await susUserSchema.findOne({ GuildID: member.guild.id, SusUserID: member.id });
            if (result) return await staffChannel.send({ content: `@here User ${member} (${member.id}) left and rejoined the server multiple times!` });

            if (staffChannel) {
                let msg = await staffChannel.send({ content: `@here ⚠️ **Alert!** ${member}'s (${member.id}) account was created less than a month ago.`, embeds: [embed], components: [row] });

                const date = new Date();
                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;

                await susUserSchema.create({
                    GuildID: member.guild.id,
                    SusUserID: member.id,
                    MessageID: `${msg.id}`,
                    JoinDate: formattedDate,
                    TakenAction: false,
                }).catch((err) => console.error(err));
                return;
            } else {
                console.error("logChannel not found! check .json file");
            }
        }
    })

    // Emitted whenever a member becomes available.
    client.on(Events.GuildMemberAvailable, async (member) => {
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵 Member is now Available\``)
            .setThumbnail(member.displayAvatarURL())
            .addFields({ name: "Name", value: `${member} (${member.user.username})`, inline: true })
            .addFields({ name: "ID", value: member.id, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a member leaves a guild, or is kicked.
    client.on(Events.GuildMemberRemove, async (member) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = member.user.createdAt.toLocaleString('en-US', options);
        const formattedJoinedAt = member.joinedAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` Member **Left** the Server`)
            .setThumbnail(member.displayAvatarURL())
            .addFields({ name: "Name", value: `${member} (${member.user.username})`, inline: true })
            .addFields({ name: "ID", value: member.id, inline: true })
            .addFields({ name: "Bot?", value: `\`${member.user.bot}\``, inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Joined At", value: formattedJoinedAt, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a guild member changes - i.e. new role, removed role, nickname.
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setThumbnail(oldMember.displayAvatarURL())

        // Check if Nickname has Changed
        if (oldMember.nickname != newMember.nickname) {
            embed.setTitle(`\`🟡\` Member Nickname has Changed`)
                .addFields({ name: "Old Nickname", value: oldMember.nickname || "None", inline: true })
                .addFields({ name: "New Nickname", value: newMember.nickname || "None", inline: true })
                .addFields({ name: "Risk", value: msgConfig.moderateRisk, inline: false })
        }

        // Check if Server Avatar is Changed
        if (oldMember.displayAvatarURL() != newMember.displayAvatarURL()) {
            embed.setTitle(`\`🟡\` Member Avatar has changed`)
                .addFields({ name: "Name", value: `${oldMember} (${oldMember.user.username})`, inline: true })
                .addFields({ name: "ID", value: oldMember.id, inline: true })
                .addFields({ name: "Old Avatar", value: oldMember.displayAvatarURL(), inline: false })
                .addFields({ name: "New Avatar", value: newMember.displayAvatarURL(), inline: true })
        }

        // System to verify if roles have Changed
        const oldRoles = Array.from(oldMember.roles.cache.values());
        const newRoles = Array.from(newMember.roles.cache.values());

        const rolesAdded = newRoles.filter((role) => !oldRoles.includes(role));
        const rolesRemoved = oldRoles.filter((role) => !newRoles.includes(role));

        if (rolesAdded.length > 0 || rolesRemoved.length > 0) {
            embed.setTitle(`\`🟡\` Member Roles have changed`);

            if (rolesAdded.length > 0) {
                embed.addFields({ name: "Roles Added", value: rolesAdded.map(role => `${role} (ID: ${role.id})`).join(', '), inline: false });
            }

            if (rolesRemoved.length > 0) {
                embed.addFields({ name: "Roles Removed", value: rolesRemoved.map(role => `${role} (ID: ${role.id})`).join(', '), inline: false });
            }

            embed.addFields({ name: "Risk", value: msgConfig.moderateRisk, inline: false });
        }

        return sendLog(embed);
    })

    // Emitted when guild role is created
    client.on(Events.GuildRoleCreate, async (role) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = role.createdAt.toLocaleString('en-US', options);

        let permissions = 'No permissions';

        if (role.permissions.toArray().length > 0) {
            permissions = role.permissions.toArray().map(permission => `\`${permission}\``).join(', ');
        }

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`\`🟢\` New Role has Created`)
            .addFields({ name: "ID", value: role.id, inline: true })
            .addFields({ name: "Name", value: `${role} (${role.name})`, inline: true })
            .addFields({ name: "Color (base 10)", value: role.color.toString(), inline: false })
            .addFields({ name: "Icon", value: role.icon || "None", inline: true })
            .addFields({ name: "Unicode Emoji", value: role.unicodeEmoji || "None", inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Separate from others?", value: `\`${role.hoist}\``, inline: true })
            .addFields({ name: "Editable?", value: `\`${role.editable}\``, inline: false })
            .addFields({ name: "Managed?", value: `\`${role.managed}\``, inline: true })
            .addFields({ name: "Mentionable?", value: `\`${role.mentionable}\``, inline: true })
            .addFields({ name: "Role Position", value: role.position.toString(), inline: false })
            .addFields({ name: "Role Raw Position", value: role.rawPosition.toString(), inline: true })
            .addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false })

        return sendLog(embed);
    })

    // Emitted when guild role is deleted
    client.on(Events.GuildRoleDelete, async (role) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = role.createdAt.toLocaleString('en-US', options);

        if (role.permissions.toArray().length > 0) {
            permissions = role.permissions.toArray().map(permission => `\`${permission}\``).join(', ');
        }

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`\`🟢\` Role has been Deleted`)
            .addFields({ name: "ID", value: role.id, inline: true })
            .addFields({ name: "Name", value: `${role} (${role.name})`, inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Separate from others?", value: `\`${role.hoist}\``, inline: false })
            .addFields({ name: "Mentionable?", value: `\`${role.mentionable}\``, inline: true })
            .addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false })

        return sendLog(embed);
    })

    // Emitted when guild role is updated 
    client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
        // Get Differences between roles using function at the top of file     
        const differences = getDifferences(oldRole, newRole);

        // Building the embed
        const embed = new EmbedBuilder()
            .setTitle(`\`🟡\` Role ${newRole.name} has been modified`)
            .setDescription("The following changes have been made to role:")
            .setColor("Yellow")
            .addFields({ name: "Role ID", value: newRole.id, inline: true })
            .addFields({ name: "Role Name", value: `<@${newRole.id}> (${newRole.name})`, inline: true })

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            if (key != "tags") // Won't log useless changes
                embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.moderateRisk, inline: false })
        return sendLog(embed);
    })

    // Emitted whenever a guild scheduled event is created.
    client.on(Events.GuildScheduledEventCreate, async (guildScheduledEvent) => {
        const event = guildScheduledEvent;

        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = event.createdAt.toLocaleString('en-US', options);
        const formattedStartAt = event.scheduledStartAt.toLocaleString('en-US', options);
        const formattedEndAt = event.scheduledEndAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
        embed.setColor("Green")
            .setTitle("\`🟢\` New Scheduled Event has been Created")
            .setThumbnail(event.coverImageURL())
            .addFields({ name: "Channel", value: `${event.channel} (${event.channelId})`, inline: false })
            .addFields({ name: "Creator", value: `${event.creator} ${event.creatorId}`, inline: false })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Location", value: event.entityMetadata.location.toString(), inline: true })
            .addFields({ name: "Event Name", value: event.name.toString(), inline: false })
            .addFields({ name: "Description", value: event.description || "None", inline: true })
            .addFields({ name: "ID", value: event.id, inline: true })
            .addFields({ name: "Image", value: event.coverImageURL() || "None", inline: true })
            .addFields({ name: "Scheduled Start", value: formattedStartAt, inline: false })
            .addFields({ name: "Scheduled End", value: formattedEndAt, inline: true })
            .addFields({ name: "Status", value: `\`${event.status.toString()}\``, inline: true })
            .addFields({ name: "Event URL", value: event.url, inline: false })
            .addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a guild scheduled event is deleted.
    client.on(Events.GuildScheduledEventDelete, async (guildScheduledEvent) => {
        const event = guildScheduledEvent;

        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = event.createdAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
        embed.setColor("Green")
            .setTitle("\`🟢\` Existing Scheduled Event has been Deleted")
            .setThumbnail(event.coverImageURL())
            .addFields({ name: "Creator", value: `${event.creator} ${event.creatorId}`, inline: false })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Location", value: event.entityMetadata.location.toString(), inline: true })
            .addFields({ name: "Event Name", value: event.name.toString(), inline: false })
            .addFields({ name: "Description", value: event.description || "None", inline: true })
            .addFields({ name: "ID", value: event.id, inline: true })
            .addFields({ name: "Image", value: event.coverImageURL() || "None", inline: true })
            .addFields({ name: "Event URL", value: event.url, inline: false })
            .addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a guild scheduled event gets updated.
    client.on(Events.GuildScheduledEventUpdate, async (oldGuildScheduledEvent, newGuildScheduledEvent) => {
        const oldEvent = oldGuildScheduledEvent;
        const newEvent = newGuildScheduledEvent;

        const differences = getDifferences(oldEvent, newEvent);

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Existing Scheduled Event has been modified`)
            .setDescription("The following changes have been made to scheduled event:")
            .setColor("Blue")
            .addFields({ name: "Event ID", value: newEvent.id, inline: true })
            .addFields({ name: "Event Name", value: `${newEvent.name}`, inline: true })

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.info, inline: false })
        return sendLog(embed);
    })

    // Emitted whenever a user subscribes to a guild scheduled event
    client.on(Events.GuildScheduledEventUserAdd, async (guildScheduledEvent, user) => {
        const event = guildScheduledEvent;

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` User subscribed a server scheduled event`)
            .addFields({ name: "User", value: `${user} (${user.id})`, inline: false })
            .addFields({ name: "Event ID", value: event.id, inline: true })
            .addFields({ name: "Event Name", value: `${event.name}`, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info })

        return sendLog(embed);
    })

    // Emitted whenever a user unsubscribes from a guild scheduled event
    client.on(Events.GuildScheduledEventUserRemove, async (guildScheduledEvent, user) => {
        const event = guildScheduledEvent;

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` User unsuscribed a server scheduled event`)
            .addFields({ name: "User", value: `${user} (${user.id})`, inline: false })
            .addFields({ name: "Event ID", value: event.id, inline: true })
            .addFields({ name: "Event Name", value: `<@${event.id}> (${event.name})`, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info })

        return sendLog(embed);
    })

    // Server Sticker Created
    client.on(Events.GuildStickerCreate, async (sticker) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = sticker.createdAt.toLocaleString('en-US', options);

        var stickerFormat = sticker.format;
        switch (stickerFormat) {
            case 1:
                stickerFormat = "PNG";
                break;
            case 2:
                stickerFormat = "APNG";
                break;
            case 3:
                stickerFormat = "Lottie";
                break;
            case 4:
                stickerFormat = "GIF";
                break;
            default:
                stickerFormat = "Unknown";
        }

        var stickerType = sticker.type;
        switch (stickerType) {
            case 1:
                stickerType = "Official sticker";
                break;
            case 2:
                stickerType = "Server Sticker";
                break;
            default:
                stickerType = "Unknown";
        }

        var user = await sticker.fetchUser(); if (!user) user = "Unknown";
        var stickerPack = await sticker.fetchPack(); if (!stickerPack || !stickerPack.id) stickerPack = "None"; // Prevent error

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` Server Sticker created`)
            .setThumbnail(sticker.url)
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: false })
            .addFields({ name: "Name", value: sticker.name, inline: true })
            .addFields({ name: "ID", value: sticker.id, inline: true })
            .addFields({ name: "Description", value: sticker.description, inline: true })
            .addFields({ name: "Owned by", value: `${sticker.guild} (${sticker.guildId})`, inline: false })
            .addFields({ name: "Format", value: stickerFormat, inline: true })
            .addFields({ name: "Pack ID", value: stickerPack.id || "None", inline: true })
            .addFields({ name: "Sticker Type", value: stickerType, inline: false })
            .addFields({ name: "URL", value: sticker.url, inline: true })
            .addFields({ name: "Uploaded by", value: `<@${user.id}> (${user.id})`, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Server Sticker Deleted
    client.on(Events.GuildStickerDelete, async (sticker) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = sticker.createdAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`\`🔵\` Server Sticker deleted`)
            .setThumbnail(sticker.url)
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: false })
            .addFields({ name: "Name", value: sticker.name, inline: true })
            .addFields({ name: "ID", value: sticker.id, inline: true })
            .addFields({ name: "Owned by", value: `${sticker.guild} (${sticker.guildId})`, inline: false })
            .addFields({ name: "URL", value: sticker.url, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Server Sticker Updated
    client.on(Events.GuildStickerUpdate, async (oldSticker, newSticker) => {
        const differences = getDifferences(oldSticker, newSticker);

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Server sticker ${newSticker.name} has been modified`)
            .setThumbnail(oldSticker.url)
            .setDescription("The following changes have been made to server sticker:")
            .setColor("Blue")
            .addFields({ name: "ID", value: newSticker.id, inline: true })

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.info, inline: false })
        return sendLog(embed);
    })

    // Emitted whenever a guild becomes unavailable, likely due to a server outage.
    client.on(Events.GuildUnavailable, async (guild) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔴\` Server ${guild.name} is unavailable (probably due to discord API issues)`)
            .setColor("Red")
            .addFields({ name: "Risk", value: msgConfig.error, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a guild is updated - e.g. name change.
    client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
        const differences = getDifferences(oldGuild, newGuild);

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Server ${oldGuild.name} has been modified`)
            .setDescription("The following changes have been made to server:")
            .setColor("Blue")
            .addFields({ name: "Server ID", value: oldGuild.id, inline: true });

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.info, inline: false });
        return sendLog(embed);
    });

    // // Emitted when an interaction is created.
    // client.on(Events.InteractionCreate, async (interaction) => {
    //     return console.log(interaction);
    // });

    // // Cache Invalidated (refreshed)
    // client.on(Events.Invalidated, async () => {
    //     return console.log("Cache Refreshed");
    // })

    // Emitted when an invite is created. This event requires the PermissionFlagsBits permission for the channel.
    client.on(Events.InviteCreate, async (invite) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const formattedCreatedAt = invite.createdAt.toLocaleString('en-US', options);

        var formattedExpiresAt;
        if (!invite.expiresAt) // To prevent crash if invite is permanent (expiresAt is null if invite is permanent)
            formattedExpiresAt = "Never";
        else
            formattedExpiresAt = invite.expiresAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` New Server Invite has been created`)
            .setColor("Blue")
            .addFields({ name: "Invite Channel", value: `${invite.channel} (${invite.channelId})`, inline: false })
            .addFields({ name: "Invite Code", value: invite.code, inline: true })
            .addFields({ name: "Created At", value: formattedCreatedAt, inline: true })
            .addFields({ name: "Expires At", value: formattedExpiresAt, inline: true })
            .addFields({ name: "Inviter", value: `${invite.inviter} (${invite.inviterId})`, inline: false })
            .addFields({ name: "Deletable by user?", value: `\`${invite.deletable}\``, inline: true })
            .addFields({ name: "Max Uses", value: invite.maxUses.toString(), inline: true })
            .addFields({ name: "Temp join?", value: `\`${invite.temporary}\``, inline: true })
            .addFields({ name: "Uses until now", value: invite.uses.toString(), inline: false })
            .addFields({ name: "URL", value: invite.url, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    });

    // Emitted when an invite is deleted. This event requires the PermissionFlagsBits permission for the channel.
    client.on(Events.InviteDelete, async (invite) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        var formattedExpiresAt;
        if (!invite.expiresAt) // To prevent crash if invite is permanent (expiresAt is null if invite is permanent)
            formattedExpiresAt = "Never";
        else
            formattedExpiresAt = invite.expiresAt.toLocaleString('en-US', options);

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Server Invite has been deleted`)
            .setColor("Blue")
            .addFields({ name: "Invite Code", value: invite.code, inline: true })
            .addFields({ name: "Expires At", value: formattedExpiresAt, inline: true })
            .addFields({ name: "URL", value: invite.url, inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever messages are deleted in bulk.
    client.on(Events.MessageBulkDelete, async (messages, channel) => {
        let title = `\`🟣\` Messages have been bulk deleted`

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor("Purple")
            .addFields({ name: "Channel", value: `${channel} (${channel.id})`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.raidRisk, inline: false })

        return sendLog(embed, false, channel.id, title);
    })

    // Emitted whenever a message is created.
    // client.on(Events.MessageCreate, async (message) => {
    //     return console.log(message);
    // })

    // Emitted whenever a message is deleted. (without deleted by)
    client.on(Events.MessageDelete, async (message) => {
        const mes = message.content;

        if (!mes) return;

        let attachments = await message.attachments.map(attachment => attachment.url);

        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle(`\`🟡\` Message deleted`)
            .addFields({ name: "Message Author", value: `${message.author}`, inline: true })
            .addFields({ name: "Message Content", value: `${mes}`, inline: true })
            .addFields({ name: "Message Channel", value: `${message.channel}`, inline: true })
            .addFields({ name: "Risk", value: msgConfig.moderateRisk, inline: false });

        if (attachments.length > 0) {
            embed.addFields({ name: "Message Attachments", value: attachments.join(" , ") });
        }

        return sendLog(embed);
    });

    // Emitted whenever a reaction is added to a cached message.
    client.on(Events.MessageReactionAdd, async (messageReaction, user) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Reaction Added to a Message`)
            .setColor("Blue")
            .addFields({ name: "Emoji ID", value: messageReaction.emoji.identifier, inline: false })
            .addFields({ name: "Emoji Name", value: messageReaction.emoji.name, inline: true })
            .addFields({ name: "Emoji URL", value: messageReaction.emoji.imageURL() || "Def. emojis have no URL", inline: true })
            .addFields({ name: "Emoji Preview", value: messageReaction.emoji.toString(), inline: false })
            .addFields({ name: "Same Emoji Count", value: messageReaction.count.toString(), inline: true })
            .addFields({ name: "Message Author", value: `${messageReaction.message.author} (${messageReaction.message.author.id})`, inline: false })
            .addFields({ name: "Message Channel", value: `${messageReaction.message.channel} (${messageReaction.message.channelId})`, inline: true })
            .addFields({ name: "Message Content", value: messageReaction.message.content || "Unknown", inline: true })
            .addFields({ name: "Message ID", value: messageReaction.message.id, inline: true })
            .addFields({ name: "Added by", value: `${user} (${user.id})`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a reaction is removed from a cached message.
    client.on(Events.MessageReactionRemove, async (messageReaction, user) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Reaction Removed from a Message`)
            .setColor("Blue")
            .addFields({ name: "Emoji ID", value: messageReaction.emoji.identifier, inline: false })
            .addFields({ name: "Emoji Name", value: messageReaction.emoji.name, inline: true })
            .addFields({ name: "Emoji URL", value: messageReaction.emoji.imageURL() || "Def. emojis have no URL", inline: true })
            .addFields({ name: "Emoji Preview", value: messageReaction.emoji.toString(), inline: false })
            .addFields({ name: "Message Author", value: `${messageReaction.message.author} (${messageReaction.message.author.id})`, inline: false })
            .addFields({ name: "Message Channel", value: `${messageReaction.message.channel} (${messageReaction.message.channelId})`, inline: true })
            .addFields({ name: "Message Content", value: messageReaction.message.content || "Unknown", inline: true })
            .addFields({ name: "Message ID", value: messageReaction.message.id, inline: true })
            .addFields({ name: "Added by", value: `${user} (${user.id})`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever all reactions are removed from a cached message.
    client.on(Events.MessageReactionRemoveAll, async (message, reactions, messageReactions) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Message no longer has any reaction`)
            .setColor("Blue")
            .addFields({ name: "Message Channel", value: `<#${message.channelId}> (${message.channelId})`, inline: false })
            .addFields({ name: "Message ID", value: message.id, inline: true })
            .addFields({ name: "Message Author", value: `${message.author} (${message.author.id})`, inline: true })
            .addFields({ name: "Message Content", value: message.content || "Unknown", inline: false })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted when a bot removes an emoji reaction from a cached message.
    client.on(Events.MessageReactionRemoveEmoji, async (messageReaction) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` a Bot Removed an Emoji from a Message`)
            .addFields({ name: "Channel", value: `${messageReaction.message.channel} (${messageReaction.message.channelId})` })
            .addFields({ name: "Message Channel", value: `${messageReaction.message.channel} (${messageReaction.message.channelId})`, inline: false })
            .addFields({ name: "Message ID", value: messageReaction.message.id, inline: true })
            .addFields({ name: "Message Author", value: `${messageReaction.message.author} (${messageReaction.message.author.id})`, inline: true })
            .addFields({ name: "Message Content", value: messageReaction.message.content || "Unknown", inline: false })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a message is updated - e.g. embed or content change.
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (oldMessage.author.bot || newMessage.author.bot) return;

        if (!oldMessage || !newMessage) return;

        const executor = oldMessage.author;

        const oldContent = oldMessage.content;
        const newContent = newMessage.content;

        if (oldContent === newContent) return;

        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("`🟡` Message Edited")
            .addFields({ name: "Old Message", value: `${oldContent}`, inline: false })
            .addFields({ name: "New Message", value: `${newContent}`, inline: false })
            .addFields({ name: "Edited By", value: `<@${executor.id}> (${executor.tag})`, inline: false })
            .addFields({ name: "Risk", value: msgConfig.moderateRisk, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a guild member's presence (e.g. status, activity) is changed.
    // client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔵\` User Changed his status`)
    //         .setColor("Blue")
    //         .addFields({ name: "User", value: `<@${newPresence.userId}> (${newPresence.userId})`, inline: false })
    //         .addFields({ name: "Status", value: `\`${newPresence.status}\``, inline: true })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted when the client becomes ready to start working.
    // client.on(Events.Ready, async (client) => {
    //     return console.log("Client ", client, " is ready!".red);
    // })

    // Emitted when a shard's WebSocket disconnects and will no longer reconnect.
    // client.on(Events.ShardDisconnect, async (event, id) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔵\` Shard Disconnected`)
    //         .setColor("Blue")
    //         .addFields({ name: "ID", value: id.toString(), inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted whenever a shard's WebSocket encounters a connection error.
    // client.on(Events.ShardError, async (error, shardId) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔴\` Shard Error`)
    //         .setColor("Blue")
    //         .addFields({ name: "Shard ID", value: shardId.toString(), inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.error, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted when a shard turns ready.
    // client.on(Events.ShardReady, async (id, unavilableGuilds) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔵\` Shard turned ready`)
    //         .setColor("Blue")
    //         .addFields({ name: "ID", value: id.toString(), inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted when a shard is attempting to reconnect or re-identify.
    // client.on(Events.ShardReconnecting, async (id) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔵\` Shard Reconnecting`)
    //         .setColor("Blue")
    //         .addFields({ name: "ID", value: id.toString(), inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted when a shard resumes successfully.
    // client.on(Events.ShardResume, async (id, replayedEvents) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔵\` Shard Resumed`)
    //         .setColor("Blue")
    //         .addFields({ name: "ID", value: id.toString(), inline: false })
    //         .addFields({ name: "Risk", value: msgConfig.info, inline: false })

    //     return sendLog(embed);
    // })

    // Emitted whenever a stage instance is created.
    client.on(Events.StageInstanceCreate, async (stageInstance) => {
        var privacyLevel = stageInstance.privacyLevel;

        privacyLevel == 1 ? privacyLevel = "Public" : privacyLevel = "GuildOnly";

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Conference has started`)
            .setColor("Blue")
            .addFields({ name: "Stage Topic", value: stageInstance.topic, inline: false })
            .addFields({ name: "Stage ID", value: stageInstance.id, inline: true })
            .addFields({ name: "Stage Channel", value: `<#${stageInstance.channelId}> (${stageInstance.channelId})`, inline: true })
            .addFields({ name: "Privacy Level", value: privacyLevel, inline: false })
            .addFields({ name: "Discoverable Disabled?", value: `\`${stageInstance.discoverableDisabled}\``, inline: true })
            .addFields({ name: "Server Scheduled Event", value: stageInstance.guildScheduledEventId || "None", inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a stage instance is deleted.
    client.on(Events.StageInstanceDelete, async (stageInstance) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Conference has ended`)
            .setColor("Blue")
            .addFields({ name: "Stage Topic", value: stageInstance.topic, inline: false })
            .addFields({ name: "Stage Channel", value: `<#${stageInstance.channelId}> (${stageInstance.channelId})`, inline: true })
            .addFields({ name: "Server Scheduled Event", value: stageInstance.guildScheduledEventId || "None", inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a stage instance gets updated - e.g. change in topic or privacy level
    client.on(Events.StageInstanceUpdate, async (oldStageInstance, newStageInstance) => {
        const differences = getDifferences(oldStageInstance, newStageInstance);

        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Conference with ID ${oldStageInstance.id} has been modified`)
            .setDescription("The following changes have been made to conference:")
            .setColor("Blue")
            .addFields({ name: "Conference ID", value: oldStageInstance.id, inline: true });

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.info, inline: false });
        return sendLog(embed);
    })

    // Emitted whenever a thread is created or when the client user is added to a thread.
    client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🟢\` Thread Created`)
            .setColor("Green")
            .addFields({ name: "Thread ID", value: thread.id, inline: false })
            .addFields({ name: "Thread Name", value: thread.name, inline: true })
            .addFields({ name: "Thread Locked?", value: `\`${thread.locked}\``, inline: true })
            .addFields({ name: "Thread Invitable?", value: `\`${thread.locked}\``, inline: true })
            .addFields({ name: "Archived?", value: `\`${thread.archived}\``, inline: true })
            .addFields({ name: "RateLimit Per User", value: thread.rateLimitPerUser.toString(), inline: true })
            .addFields({ name: "Owner User", value: `<@${thread.ownerId}> (${thread.ownerId})`, inline: true })
            .addFields({ name: "Auto-Archive Time", value: thread.autoArchiveDuration.toString(), inline: false })
            .addFields({ name: "Message Count", value: thread.messageCount.toString(), inline: true })
            .addFields({ name: "Member Count", value: thread.memberCount.toString(), inline: true })
            .addFields({ name: "Newly Created?", value: `\`${newlyCreated}\``, inline: true })
            .addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a thread is deleted.
    client.on(Events.ThreadDelete, async (threadChannel) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Thread Deleted`)
            .setColor("Blue")
            .addFields({ name: "Thread ID", value: threadChannel.id, inline: false })
            .addFields({ name: "Thread Name", value: threadChannel.name, inline: true })
            .addFields({ name: "Owner User", value: `<@${threadChannel.ownerId}> (${threadChannel.ownerId})`, inline: true })
            .addFields({ name: "Message Count", value: threadChannel.messageCount.toString(), inline: false })
            .addFields({ name: "Member Count", value: threadChannel.memberCount.toString(), inline: true })
            .addFields({ name: "Risk", value: msgConfig.info, inline: false })

        return sendLog(embed);
    })

    // Emitted whenever the client user gains access to a text or news channel that contains threads
    // client.on(Events.ThreadListSync, async (threads, guild) => {
    //     return console.log("threads: ", threads, "guild: ", guild)
    // })

    // Emitted whenever members are added or removed from a thread. This event requires the GatewayIntentBits privileged gateway intent.
    // Emitted whenever the client user's thread member is updated.
    // client.on(Events.ThreadMemberUpdate, async (oldMember, newMember) => {
    //     console.log("old: ", oldMember, " new: ", newMember);
    // })

    // Emitted whenever members are added or removed from a thread. This event requires the GatewayIntentBits privileged gateway intent.
    client.on(Events.ThreadMembersUpdate, async (addedMembers, removedMembers, thread) => { // TODO
        console.log("added: ", addedMembers, " removed: ", removedMembers, " thread: ", thread);
    })

    // Emitted whenever the client user's thread member is updated.
    client.on(Events.ThreadMemberUpdate, async (oldMember, newMember) => { // TODO

    })

    // Emitted whenever a thread is updated - e.g. name change, archive state change, locked state change.
    client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
        const differences = getDifferences(oldThread, newThread);

        const embed = new EmbedBuilder()
            .setTitle(`\`🟢\` Thread <#${oldThread.id}> has been modified`)
            .setDescription("The following changes have been made to thread:")
            .setColor("Blue")
            .addFields({ name: "Thread ID", value: oldThread.id, inline: true });

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false });
        return sendLog(embed);
    })

    // Emitted whenever a user starts typing in a channel.
    // client.on(Events.TypingStart, async (typing) => {
    //     const embed = new EmbedBuilder()
    //         .setTitle(`\`🔵\` User Started Typing`)
    //         .setColor("Blue")
    //         .addFields({ name: "Channel", value: `${typing.channel} (${typing.channel.id})`, inline: false })
    //         .addFields({ name: "User", value: `${typing.member} (${typing.member.id})`, inline: true })

    //     return sendLog(embed);
    // })

    // Emitted whenever a user's details (e.g. username) are changed. Triggered by the Discord gateway events UserUpdate, GuildMemberUpdate, and PresenceUpdate.
    client.on(Events.UserUpdate, async (oldUser, newUser) => {
        const differences = getDifferences(oldUser, newUser);

        const embed = new EmbedBuilder()
            .setTitle(`\`🟢\` User details of ${oldUser.globalName} are changed`)
            .setDescription("The following changes have been made to user:")
            .setColor("Green")
            .addFields({ name: "User ID", value: oldUser.id, inline: true });

        for (const key in differences) {
            const { oldValue, newValue } = differences[key];
            embed.addFields({ name: key, value: `Before: ${oldValue}\nAfter: ${newValue}`, inline: false });
        }

        embed.addFields({ name: "Risk", value: msgConfig.lowRisk, inline: false });
        return sendLog(embed);
    })

    // Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const user = await client.users.fetch(newState.id)
        const embed = new EmbedBuilder()
            .setAuthor({ name: user.globalName, iconURL: msgConfig.author_img })
            .setColor("Blue")

        if (newState.serverDeaf)
            embed.setDescription(`User ${user} has been deafened by someone in <#${newState.channelId}>`)
        else if (oldState.serverDeaf && !newState.serverDeaf)
            embed.setDescription(`User ${user} has been undeafened by someone in <#${newState.channelId}>`)
        else if (newState.serverMute)
            embed.setDescription(`User ${user} has been muted by someone in <#${newState.channelId}>`)
        else if (oldState.serverMute && !newState.serverMute)
            embed.setDescription(`User ${user} has been unmuted by someone in <#${newState.channelId}>`)
        else if (newState.streaming)
            embed.setDescription(`User ${user} started streaming in <#${newState.channelId}>`)
        else if (oldState.streaming && !newState.streaming)
            embed.setDescription(`User ${user} finished streaming in <#${newState.channelId}>`)
        else if (!oldState.channelId && newState.channelId)
            embed.setDescription(`User ${user} joined <#${newState.channelId}>`)
        else if (!newState.channelId)
            embed.setDescription(`User ${user} left <#${oldState.channelId}>`)
        else if ((oldState.channelId && newState.channelId) && (oldState.channelId != newState.channelId))
            embed.setDescription(`User ${user} switched from <#${oldState.channelId}> to <#${newState.channelId}>`)
        else
            return; // Other changes (which will not be logged)

        embed.addFields({ name: "Risk", value: msgConfig.info, inline: false });
        return sendLog(embed);
    })

    // Emitted for general warnings.
    client.on(Events.Warn, async (info) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Warn Info`)
            .setColor("Blue")
            .addFields({ name: "Info", value: "info", inline: false })

        return sendLog(embed);
    })

    // Emitted whenever a channel has its webhooks changed. (webhookUpdate is deprecated in Discord.js v14)
    client.on(Events.WebhooksUpdate, async (channel) => {
        const embed = new EmbedBuilder()
            .setTitle(`\`🔵\` Channel's webhooks have changed`)
            .setColor("Blue")
            .addFields({ name: "Channel", value: `${channel} (${channel.id})`, inline: false })

        return sendLog(embed);
    })
}