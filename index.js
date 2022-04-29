const fetch = require("node-fetch");
const { Client, Intents } = require("discord.js");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const config = require("./config.json");
const rest = new REST({ version: '9' }).setToken(config.discordBotToken);
client.login(config.discordBotToken);

var servers = [];

client.on("ready", async () => {
    console.log(`${client.user.tag}にログインしました。\nCreate by Renorari`);
    client.guilds.cache.map((guild) => guild.id).forEach((guildId) => {
        rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
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
    });

    servers = await fetch("https://api.zpw.jp/serverlist/index.php").then((res) => res.json());
    setInterval(async () => {
        servers = await fetch("https://api.zpw.jp/serverlist/index.php").then((res) => res.json());
    }, 60000);

    new Proxy(servers, {
        "defineProperty": () => {
            client.channels.cache.map((channel) => (channel.type == "GUILD_TEXT" && channel.topic && channel.topic.match(/mc.notification/))).forEach(async (channel) => {
                var list = [];
                await Promise.all(servers.map(async (server) => {
                    var owner_name = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${server.owner}`).then((res) => res.json()).then((data) => data.name);
                    list.push({
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
                    "content": "サーバーリスト",
                    "embeds": list
                });
            });
        }
    });
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
            var list = [];
            await Promise.all(servers.map(async (server) => {
                var owner_name = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${server.owner}`).then((res) => res.json()).then((data) => data.name);
                list.push({
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
                "content": "サーバーリスト",
                "embeds": list
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