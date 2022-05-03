const fetch = require("node-fetch");
const { Client, Intents } = require("discord.js");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const config = require("./config.json");
const sliceByNumber = (array, number) => {
    const length = Math.ceil(array.length / number);
    return new Array(length).fill().map((_, i) =>
        array.slice(i * number, (i + 1) * number)
    );
};
const rest = new REST({ version: '9' }).setToken(config.discordBotToken);
client.login(config.discordBotToken);

var servers = [];

client.on("ready", async () => {
    console.log(`${client.user.tag}にログインしました。\nCreate by Renorari`);
    rest.put(
        Routes.applicationGuildCommands(client.user.id),
        {
            body: [
                new SlashCommandBuilder()
                    .setName("ping")
                    .setDescription("現在の接続状況を表示します"),
                new SlashCommandBuilder()
                    .setName("servers")
                    .setDescription("サーバーリストを表示します"),
                new SlashCommandBuilder()
                    .setName("notification")
                    .setDescription("通知機能")
                    .addSubcommand(
                        new SlashCommandSubcommandBuilder()
                            .setName("enable")
                            .setDescription("有効にします")
                    )
                    .addSubcommand(
                        new SlashCommandSubcommandBuilder()
                            .setName("disable")
                            .setDescription("無効にします")
                    )
            ]
        },
    );

    servers = await fetch("https://api.zpw.jp/serverlist/index.php").then((res) => res.json());
    setInterval(async () => {
        var now_servers = await fetch("https://api.zpw.jp/serverlist/index.php").then((res) => res.json());
        if (now_servers != servers) {
            servers = now_servers;
            client.channels.cache.forEach(async (channel) => {
                if (channel.type != "GUILD_TEXT") return;
                if (!channel.topic) return;
                if (!channel.topic.match(/mc.notification/)) return;

                var lists = [];
                await Promise.all(servers.map(async (server) => {
                    var owner_name = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${server.owner}`).then((res) => res.json()).then((data) => data.name);
                    lists.push({
                        "title": server.servername,
                        "author": {
                            "iconURL": `https://crafthead.net/avatar/${server.owner}`,
                            "name": owner_name
                        },
                        "color": "BLUE",
                        "description": server.serverexp.replace(/!n/g, "\n"),
                        "fields": [
                            {
                                "inline": true,
                                "name": "プレイヤー数",
                                "value": `${server.onlineplayer} / ${server.maxplayer}`
                            },
                            {
                                "inline": true,
                                "name": "投票数",
                                "value": `${server.votes}投票`
                            },
                            {
                                "name": "バージョン",
                                "value": `${server.servertype} ${server.version}`
                            },
                            {
                                "name": "ドメイン",
                                "value": `${server.domain}`
                            }
                        ],
                        "footer": {
                            "text": `ServerNumber: ${server.no} | Create by Renorari`
                        }
                    })
                }));
                await channel.send({
                    "content": "サーバーリスト"
                });
                sliceByNumber(lists, 10).forEach(async (list) => {
                    await channel.send({
                        "embeds": list
                    });
                });
            });
        };
    }, 60000);
});

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        await interaction.deferReply();
        if (interaction.commandName == "ping") {
            await interaction.editReply({
                "content": "ポン!",
                "embeds": [
                    {
                        "fields": [
                            {
                                "name": "WebSocket速度",
                                "value": `${client.ws.ping}㍉秒`
                            }
                        ],
                        "footer": {
                            "text": "Create by Renorari(renorari.net)"
                        }
                    }
                ]
            });
        } else if (interaction.commandName == "servers") {
            var lists = [];
            await Promise.all(servers.map(async (server) => {
                var owner_name = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${server.owner}`).then((res) => res.json()).then((data) => data.name);
                lists.push({
                    "title": server.servername,
                    "author": {
                        "iconURL": `https://crafthead.net/avatar/${server.owner}`,
                        "name": owner_name
                    },
                    "color": "BLUE",
                    "description": server.serverexp.replace(/!n/g, "\n"),
                    "fields": [
                        {
                            "inline": true,
                            "name": "プレイヤー数",
                            "value": `${server.onlineplayer} / ${server.maxplayer}`
                        },
                        {
                            "inline": true,
                            "name": "投票数",
                            "value": `${server.votes}投票`
                        },
                        {
                            "name": "バージョン",
                            "value": `${server.servertype} ${server.version}`
                        },
                        {
                            "name": "ドメイン",
                            "value": `${server.domain}`
                        }
                    ],
                    "footer": {
                        "text": `ServerNumber: ${server.no} | Create by Renorari`
                    }
                })
            }));
            await interaction.editReply({
                "content": "サーバーリスト"
            });
            sliceByNumber(lists, 10).forEach(async (list) => {
                await interaction.channel.send({
                    "embeds": list
                });
            });
        } else if (interaction.commandName == "notification") {
            if (interaction.options.getSubcommand() == "enable") {
                if (!interaction.member.permissions.has("MANAGE_CHANNELS")) return interaction.editReply({
                    "content": "エラー",
                    "embeds": [
                        {
                            "title": "エラー",
                            "color": "RED",
                            "description": "権限不足。\nあなたは変更することはできません。"
                        }
                    ]
                });

                if (interaction.channel.topic && interaction.channel.topic.match(/mc.notification/)) return interaction.editReply({
                    "content": "エラー",
                    "embeds": [
                        {
                            "title": "エラー",
                            "color": "RED",
                            "description": "すでに有効になっています。"
                        }
                    ]
                });

                await interaction.channel.setTopic((interaction.channel.topic) ? `${interaction.channel.topic}\n\nmc.notification` : "mc.notification");
                await interaction.editReply({
                    "content": "有効になりました。"
                });
            } else if (interaction.options.getSubcommand() == "disable") {
                if (!interaction.member.permissions.has("MANAGE_CHANNELS")) return interaction.editReply({
                    "content": "エラー",
                    "embeds": [
                        {
                            "title": "エラー",
                            "color": "RED",
                            "description": "権限不足。\nあなたは変更することはできません。"
                        }
                    ]
                });

                if (!interaction.channel.topic || !interaction.channel.topic.match(/mc.notification/)) return interaction.editReply({
                    "content": "エラー",
                    "embeds": [
                        {
                            "title": "エラー",
                            "color": "RED",
                            "description": "すでに無効になっています。"
                        }
                    ]
                });

                await interaction.channel.setTopic(interaction.channel.topic.replace(/mc.notification/g, ""));
                await interaction.editReply({
                    "content": "無効になりました。"
                });
            } else {
                await interaction.editReply({
                    "content": "エラー",
                    "embeds": [
                        {
                            "title": "エラー",
                            "color": "RED",
                            "description": "不明なサブコマンドです。\n正しいコマンドを入力してください。"
                        }
                    ]
                });
            };
        } else {
            await interaction.editReply({
                "content": "エラー",
                "embeds": [
                    {
                        "title": "エラー",
                        "color": "RED",
                        "description": "不明なコマンドです。\n正しいコマンドを入力してください。"
                    }
                ],
                "ephemeral": true
            })
        };
    };
});
