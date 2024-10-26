const client = require("../../index.js");
const { EmbedBuilder } = require("discord.js");

module.exports = async () => {
    const status = queue =>
        `Volume: \`${queue.volume}%\` | Filter: \`${queue.filters.names.join(', ') || 'Off'}\` | Loop: \`${queue.repeatMode ? (queue.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'
        }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``
    client.distube
        .on('playSong', (queue, song) =>
            queue.textChannel.send({
                embeds: [new EmbedBuilder().setColor("Green")
                    .setDescription(`\`🎶\` Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${song.user
                        }\n${status(queue)}`)]
            })
        )
        .on('addSong', (queue, song) =>
            queue.textChannel.send(
                {
                    embeds: [new EmbedBuilder().setColor("Green")
                        .setDescription(`\`🎶\` Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`)]
                }
            )
        )
        .on('addList', (queue, playlist) =>
            queue.textChannel.send(
                {
                    embeds: [new EmbedBuilder().setColor("Green")
                        .setDescription(`\`🎶\` Added \`${playlist.name}\` playlist (${playlist.songs.length
                            } songs) to queue\n${status(queue)}`)]
                }
            )
        )
        .on('error', (channel, e) => {
            if (channel) {
                console.log("channel: ", channel)
                channel.send({
                    embeds: [new EmbedBuilder().setColor("Red")
                        .setDescription(`\`⛔\` An error has occurred!`)]
                })
            }
            else
                console.error(e);
        })
        .on('empty', (queue) =>
            queue.textChannel.send({
                embeds: [new EmbedBuilder().setColor("Red")
                    .setDescription(`\`⛔\` Leaving because the VC is empty!`)]
            })
        )
        .on('searchNoResult', (queue, query) =>
            queue.textChannel.send(
                {
                    embeds: [new EmbedBuilder().setColor("Red")
                        .setDescription(`\`⛔\` No result found for \`${query}\`!`)]
                })
        )
        .on('finish', queue => queue.textChannel.send({
            embeds: [new EmbedBuilder().setColor("Green")
                .setDescription('\`🏁\` Queue finished!')]
        }))
        // .on('disconnect', (queue) => {
        //     queue.textChannel.send({
        //         embeds: [new EmbedBuilder().setColor("Red")
        //             .setDescription(`\`⛔\` Bot has been disconnected from VC`)]
        //     })
        // })
}