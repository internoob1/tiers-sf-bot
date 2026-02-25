
// ======================================================
// TIERS SF — SISTEMA COMPLETO
// Verificación + Queues + Testers + Tickets + Rangos
// ======================================================

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionsBitField,
    Events,
    REST,
    Routes
} = require("discord.js");

const axios = require("axios");

// ======================================================
// DESCARGAR JSON DESDE GITHUB (tiers-sf-web)
// ======================================================

async function downloadFromGitHub() {
    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    const files = ["tiers_players.json", "tiers_ranking.json"];

    for (const file of files) {
        try {
            const url = `https://api.github.com/repos/${user}/${repo}/contents/${file}`;

            const res = await axios.get(url, {
                headers: {
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github.v3.raw"
                }
            });

            fs.writeFileSync(`./${file}`, res.data);
            console.log(`⬇️ Archivo descargado desde GitHub: ${file}`);

        } catch (err) {
            console.log(`⚠️ No se pudo descargar ${file} desde GitHub. Se usará el archivo local.`);
        }
    }
}

// ======================================================
// SUBIR tiers_ranking.json A GITHUB (tiers-sf-web)
// ======================================================

async function uploadRankingToGitHub() {
    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    const filePath = "./tiers_ranking.json";
    const fileName = "tiers_ranking.json";

    try {
        const content = fs.readFileSync(filePath, "utf8");
        const encoded = Buffer.from(content).toString("base64");

        // Obtener SHA del archivo actual en GitHub
        const getUrl = `https://api.github.com/repos/${user}/${repo}/contents/${fileName}`;
        let sha = null;

        try {
            const res = await axios.get(getUrl, {
                headers: { Authorization: `token ${token}` }
            });
            sha = res.data.sha;
        } catch (err) {
            console.log("ℹ️ El archivo no existe en GitHub, se creará uno nuevo.");
        }

        // Subir archivo
        const putUrl = `https://api.github.com/repos/${user}/${repo}/contents/${fileName}`;

        await axios.put(
            putUrl,
            {
                message: "Auto-update tiers_ranking.json",
                content: encoded,
                sha: sha || undefined
            },
            {
                headers: { Authorization: `token ${token}` }
            }
        );

        console.log("⬆️ tiers_ranking.json subido correctamente a GitHub.");

    } catch (err) {
        console.error("❌ Error subiendo tiers_ranking.json:", err.response?.data || err);
    }
}

// ======================================================
// SUBIR tiers_players.json A GITHUB (tiers-sf-web)
// ======================================================

async function uploadPlayersToGitHub() {
    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    const filePath = "./tiers_players.json";
    const fileName = "tiers_players.json";

    try {
        const content = fs.readFileSync(filePath, "utf8");
        const encoded = Buffer.from(content).toString("base64");

        // Obtener SHA del archivo actual en GitHub
        const getUrl = `https://api.github.com/repos/${user}/${repo}/contents/${fileName}`;
        let sha = null;

        try {
            const res = await axios.get(getUrl, {
                headers: { Authorization: `token ${token}` }
            });
            sha = res.data.sha;
        } catch (err) {
            console.log("ℹ️ El archivo no existe en GitHub, se creará uno nuevo.");
        }

        // Subir archivo
        const putUrl = `https://api.github.com/repos/${user}/${repo}/contents/${fileName}`;

        await axios.put(
            putUrl,
            {
                message: "Auto-update tiers_players.json",
                content: encoded,
                sha: sha || undefined
            },
            {
                headers: { Authorization: `token ${token}` }
            }
        );

        console.log("⬆️ tiers_players.json subido correctamente a GitHub.");

    } catch (err) {
        console.error("❌ Error subiendo tiers_players.json:", err.response?.data || err);
    }
}

// ======================================================
// BASE DE DATOS DE JUGADORES (JSON)
// ======================================================
const fs = require("fs");

let playersDB = {};

function loadPlayersDB() {
    try {
        const data = fs.readFileSync("./tiers_players.json", "utf8");
        playersDB = JSON.parse(data);
        console.log("📁 Base de datos cargada correctamente.");
    } catch (err) {
        console.log("⚠️ No se pudo cargar tiers_players.json, creando uno nuevo...");
        playersDB = {};
        savePlayersDB();
    }
}

function savePlayersDB() {
    fs.writeFileSync("./tiers_players.json", JSON.stringify(playersDB, null, 4));
}

// ======================================================
// FUNCIONES PARA MANEJAR JUGADORES
// ======================================================

function ensurePlayer(id, nick = "No registrado", region = "Desconocida", avatar = null) {
    if (!playersDB[id]) {
        playersDB[id] = {
            nick,
            region,
            meleeRank: "Unranked",
            weaponsRank: "Unranked",
            mixedRank: "Unranked",
            lastTestDate: null,
            testerId: null,
            score: 0,
            avatar: avatar // 👈 nuevo
        };
        savePlayersDB();
    }
}

function setPlayerRank(userId, modality, rank, testerId) {
    if (!playersDB[userId]) {
        playersDB[userId] = {
            nick: "No registrado",
            region: "Desconocida",
            meleeRank: "Unranked",
            weaponsRank: "Unranked",
            mixedRank: "Unranked",
            score: 0,
            lastTestDate: null,
            testerId: null
        };
    }

    // Guardar el rango nuevo
    playersDB[userId][modality + "Rank"] = rank;
    playersDB[userId].testerId = testerId;
    playersDB[userId].lastTestDate = new Date().toISOString();
// Guardar avatar del JUGADOR (no del tester)
const playerUser = client.users.cache.get(userId);
if (playerUser) {
    playersDB[userId].avatar = playerUser.avatar;

}

    // Recalcular puntaje
    playersDB[userId].score = calculatePlayerScore(playersDB[userId]);

    savePlayersDB();
}


function updatePlayerInfo(id, nick, region, avatar) {
    ensurePlayer(id);

    playersDB[id].nick = nick;
    playersDB[id].region = region;

    if (avatar) playersDB[id].avatar = avatar; // 👈 nuevo

    savePlayersDB();
}

function calculatePlayerScore(player) {
    const melee = RANK_POINTS[player.meleeRank] || 0;
    const weapons = RANK_POINTS[player.weaponsRank] || 0;
    const mixed = RANK_POINTS[player.mixedRank] || 0;

    return melee + weapons + mixed;
}

// ======================================================
// CONFIGURACIÓN PRINCIPAL
// ======================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Channel]
});

// ⚠️ PONÉ TU TOKEN REAL ACÁ
const TOKEN = process.env.DISCORD_TOKEN;

const CLIENT_ID = "1471684778339074111";
const GUILD_ID = "1471915065551749257";

// Roles principales
const FOUNDER_ROLE_ID = "1471925560631623732";
const TESTER_ROLE_ID = "1471915312474488979";

const RANK_POINTS = {
    "HT1": 60,
    "LT1": 45,
    "HT2": 30,
    "LT2": 20,
    "HT3": 15,
    "LT3": 10,
    "HT4": 5,
    "LT4": 3,
    "HT5": 2,
    "LT5": 1,
    "Unranked": 0
};


// Verificación
const VERIFIED_ROLE_ID = "1471984699487555857";
const UNRANKED_ROLE_ID = "1471930710758785098";
const INFO_CHANNEL_ID = "1471988287567695914";

// Queues
const QUEUE_MELEE_CHANNEL_ID = "1471984969340555428";
const QUEUE_WEAPONS_CHANNEL_ID = "1471984991444664412";
const QUEUE_MIXED_CHANNEL_ID = "1471985007634415617";

// Tickets
const TICKETS_CATEGORY_ID = "1471985063372787957";

// Logs (por ahora usa info-users)
const RESULTS_LOG_CHANNEL_ID = "1471983715721674894"

// timestamp discord
const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

// ======================================================
// RANGOS POR MODALIDAD (30 ROLES)
// ======================================================

const RANK_ROLES = {
    melee: {
        HT1: "1471929575725465660",
        LT1: "1471929650325356659",
        HT2: "1471929783485993156",
        LT2: "1471929868198478056",
        HT3: "1471929991133528219",
        LT3: "1471930102559412420",
        HT4: "1471930178530705501",
        LT4: "1471930335234101405",
        HT5: "1471930437717721118",
        LT5: "1471930568450113608"
    },
    weapons: {
        HT1: "1471929600157421568",
        LT1: "1471929704725479566",
        HT2: "1471929816461611191",
        LT2: "1471929902641971394",
        HT3: "1471930033718165688",
        LT3: "1471930123530928270",
        HT4: "1471930214241271948",
        LT4: "1471930362341888174",
        HT5: "1471930464443826187",
        LT5: "1471930651241615586"
    },
    mixed: {
        HT1: "1471929626082152710",
        LT1: "1471929729497170055",
        HT2: "1471929849512722464",
        LT2: "1471929929804284104",
        HT3: "1471930077381136436",
        LT3: "1471930154845737193",
        HT4: "1471930238526034001",
        LT4: "1471930409129349304",
        HT5: "1471930498749038714",
        LT5: "1471930680312332475"
    }
};

// ======================================================
// ESTRUCTURAS EN MEMORIA
// ======================================================

const queues = {
    melee: { players: [], testers: [], message: null, channelId: QUEUE_MELEE_CHANNEL_ID, lastOpened: null },
    weapons: { players: [], testers: [], message: null, channelId: QUEUE_WEAPONS_CHANNEL_ID, lastOpened: null },
    mixed: { players: [], testers: [], message: null, channelId: QUEUE_MIXED_CHANNEL_ID, lastOpened: null }
};

const tickets = new Map(); // channelId -> { testerId, playerId, modality, selectedRank }

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {
    console.log(`🔥 TIERS SF iniciado como ${client.user.tag}`);

    await downloadFromGitHub();   // 👈 PRIMERO: sincroniza Railway con la web
    loadPlayersDB();              // 👈 Carga la base ya actualizada
    generateRankingFile();        // 👈 Genera ranking local
    await uploadRankingToGitHub(); // 👈 Sube ranking a la web

    console.log("📄 Ranking sincronizado al iniciar.");
});

setInterval(async () => {
    generateRankingFile();
    await uploadRankingToGitHub();
    console.log("⏱️ Ranking actualizado y subido a GitHub (cada 30 minutos).");
}, 30 * 60 * 1000);


// ======================================================
// FUNCIONES PARA MANEJAR JUGADORES
// ======================================================

function ensurePlayer(id, nick = "No registrado", region = "Desconocida") {
    if (!playersDB[id]) {
        playersDB[id] = {
            nick,
            region,
            meleeRank: "Unranked",
            weaponsRank: "Unranked",
            mixedRank: "Unranked",
            lastTestDate: null,
            testerId: null
        };
        savePlayersDB();
    }
}

function updatePlayerInfo(id, nick, region) {
    ensurePlayer(id);

    playersDB[id].nick = nick;
    playersDB[id].region = region;

    savePlayersDB();
}

// ======================================================
// GENERAR ARCHIVO OFICIAL DE RANKING (FASE 3)
// ======================================================

function generateRankingFile() {
    const rankingArray = Object.entries(playersDB)
.map(([id, data]) => ({
    id,
    nick: data.nick || "Sin nick",
    region: data.region || "Desconocida",
    meleeRank: data.meleeRank || "Unranked",
    weaponsRank: data.weaponsRank || "Unranked",
    mixedRank: data.mixedRank || "Unranked",
    score: data.score || 0,
    lastTestDate: data.lastTestDate || null,
    testerId: data.testerId || null,
    avatar: data.avatar || null   // 👈 ESTA ES LA LÍNEA QUE FALTABA
}))
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
            ...player,
            position: index + 1
        }));

    fs.writeFileSync("./tiers_ranking.json", JSON.stringify(rankingArray, null, 4));
    console.log("📄 Archivo oficial tiers_ranking.json actualizado.");
}


// ======================================================
// REGISTRO DE COMANDOS
// ======================================================

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    const commands = [
        {
            name: "setupverify",
            description: "Configura el sistema de verificación TIERS SF"
        },
        {
            name: "queue",
            description: "Gestión de queues",
            options: [
                {
                    type: 1,
                    name: "open",
                    description: "Abrir una queue",
                    options: [
                        {
                            type: 3,
                            name: "modality",
                            description: "Melee / Weapons / Mixed",
                            required: true,
                            choices: [
                                { name: "Melee", value: "melee" },
                                { name: "Weapons", value: "weapons" },
                                { name: "Mixed", value: "mixed" }
                            ]
                        }
                    ]
                },
                {
                    type: 1,
                    name: "close",
                    description: "Cerrar una queue",
                    options: [
                        {
                            type: 3,
                            name: "modality",
                            description: "Melee / Weapons / Mixed",
                            required: true,
                            choices: [
                                { name: "Melee", value: "melee" },
                                { name: "Weapons", value: "weapons" },
                                { name: "Mixed", value: "mixed" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            name: "leave",
            description: "Salir de todas las queues"
        },
        {
            name: "tester",
            description: "Gestión de testers",
            options: [
                {
                    type: 1,
                    name: "join",
                    description: "Unirse como tester",
                    options: [
                        {
                            type: 3,
                            name: "modality",
                            description: "Melee / Weapons / Mixed",
                            required: true,
                            choices: [
                                { name: "Melee", value: "melee" },
                                { name: "Weapons", value: "weapons" },
                                { name: "Mixed", value: "mixed" }
                            ]
                        }
                    ]
                },
                {
                    type: 1,
                    name: "leave",
                    description: "Salir como tester",
                    options: [
                        {
                            type: 3,
                            name: "modality",
                            description: "Melee / Weapons / Mixed",
                            required: true,
                            choices: [
                                { name: "Melee", value: "melee" },
                                { name: "Weapons", value: "weapons" },
                                { name: "Mixed", value: "mixed" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            name: "next",
            description: "Tomar al siguiente jugador de la queue y crear ticket",
            options: [
                {
                    type: 3,
                    name: "modality",
                    description: "Melee / Weapons / Mixed",
                    required: true,
                    choices: [
                        { name: "Melee", value: "melee" },
                        { name: "Weapons", value: "weapons" },
                        { name: "Mixed", value: "mixed" }
                    ]
                }
            ]
        },
        {
            name: "closeticket",
            description: "Cerrar el ticket actual"
        },
{
    name: "rank",
    description: "Muestra tu rango o el de otro jugador",
    options: [
        {
            type: 6,
            name: "usuario",
            description: "Jugador del que quieres ver el rango",
            required: false
        }
    ]
},
{
    name: "ranking",
    description: "Muestra el top general TIERS SF"
},
		{
    name: "admin",
    description: "Comandos administrativos de TIERS SF",
    options: [
{
    type: 1,
    name: "setrank",
    description: "Asignar un rango manualmente a un jugador",
    options: [
        {
            type: 6,
            name: "usuario",
            description: "Jugador al que asignar el rango",
            required: true
        },
        {
            type: 3,
            name: "modality",
            description: "Melee / Weapons / Mixed",
            required: true,
            choices: [
                { name: "Melee", value: "melee" },
                { name: "Weapons", value: "weapons" },
                { name: "Mixed", value: "mixed" }
            ]
        },
        {
            type: 3,
            name: "rank",
            description: "Rango a asignar",
            required: true,
            choices: [
                { name: "HT1", value: "HT1" },
                { name: "LT1", value: "LT1" },
                { name: "HT2", value: "HT2" },
                { name: "LT2", value: "LT2" },
                { name: "HT3", value: "HT3" },
                { name: "LT3", value: "LT3" },
                { name: "HT4", value: "HT4" },
                { name: "LT4", value: "LT4" },
                { name: "HT5", value: "HT5" },
                { name: "LT5", value: "LT5" }
            ]
        }
    ]
},

        {
            type: 1,
            name: "setregion",
            description: "Cambiar la región de un jugador",
            options: [
                {
                    type: 6,
                    name: "usuario",
                    description: "Jugador",
                    required: true
                },
                {
                    type: 3,
                    name: "region",
                    description: "Nueva región",
                    required: true,
                    choices: [
                        { name: "SA", value: "SA" },
                        { name: "NA", value: "NA" },
                        { name: "EU", value: "EU" }
                    ]
                }
            ]
        },
        {
            type: 1,
            name: "setnick",
            description: "Cambiar el nick de un jugador",
            options: [
                {
                    type: 6,
                    name: "usuario",
                    description: "Jugador",
                    required: true
                },
                {
                    type: 3,
                    name: "nick",
                    description: "Nuevo nick",
                    required: true
                }
            ]
        },
        {
            type: 1,
            name: "removeplayer",
            description: "Eliminar un jugador de la base de datos",
            options: [
                {
                    type: 6,
                    name: "usuario",
                    description: "Jugador a eliminar",
                    required: true
                }
            ]
        },
        {
            type: 1,
            name: "setall",
            description: "Asignar los 3 rangos de una sola vez",
            options: [
                {
                    type: 6,
                    name: "usuario",
                    description: "Jugador",
                    required: true
                },
                {
                    type: 3,
                    name: "melee",
                    description: "Rango Melee",
                    required: true,
                    choices: Object.keys(RANK_ROLES.melee).map(r => ({ name: r, value: r }))
                },
                {
                    type: 3,
                    name: "weapons",
                    description: "Rango Weapons",
                    required: true,
                    choices: Object.keys(RANK_ROLES.weapons).map(r => ({ name: r, value: r }))
                },
                {
                    type: 3,
                    name: "mixed",
                    description: "Rango Mixed",
                    required: true,
                    choices: Object.keys(RANK_ROLES.mixed).map(r => ({ name: r, value: r }))
                }
            ]
        }
    ]
}
    ];

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Comandos registrados.");
})();

// ======================================================
// FUNCIÓN: ACTUALIZAR EMBED DE QUEUE
// ======================================================

async function updateQueueEmbed(modality) {
    const q = queues[modality];
    const channel = await client.channels.fetch(q.channelId);

    const embed = new EmbedBuilder()
        .setTitle(`🧪 Queue ${modality.toUpperCase()}`)
        .addFields(
            {
                name: "Jugadores",
                value: q.players.length ? q.players.map((p, i) => `${i + 1}. ${p}`).join("\n") : "Ninguno"
            },
            {
                name: "Testers",
                value: q.testers.length ? q.testers.join("\n") : "Ninguno"
            }
        )
        .setColor(0x00AE86);

    const button = new ButtonBuilder()
        .setCustomId(`join_${modality}`)
        .setLabel("Unirse")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    if (!q.message) {
        q.message = await channel.send({ embeds: [embed], components: [row] });
    } else {
        await q.message.edit({ embeds: [embed], components: [row] });
    }
}

// ======================================================
// INTERACCIONES
// ======================================================

client.on(Events.InteractionCreate, async interaction => {
	
// ======================================================
// /ADMIN COMMANDS
// ======================================================

if (interaction.isChatInputCommand() && interaction.commandName === "admin") {
    const sub = interaction.options.getSubcommand();

    // Solo Founder puede usarlo
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(FOUNDER_ROLE_ID)) {
        return interaction.reply({
            content: "⛔ Solo el Founder puede usar comandos admin.",
            ephemeral: true
        });
    }

    // ============================
    // /admin setrank
    // ============================
if (sub === "setrank") {
    await interaction.deferReply({ ephemeral: false });

    const user = interaction.options.getUser("usuario");
	playersDB[user.id].avatar = user.avatar;
    savePlayersDB();
    const modality = interaction.options.getString("modality");
    const rank = interaction.options.getString("rank");

    if (!RANK_ROLES[modality][rank]) {
        return interaction.editReply({
            content: "⛔ Ese rango no existe."
        });
    }

    const guildMember = await interaction.guild.members.fetch(user.id);

    // Remover rangos previos
    for (const r in RANK_ROLES[modality]) {
        await guildMember.roles.remove(RANK_ROLES[modality][r]).catch(() => {});
    }

    // Asignar nuevo rango
    await guildMember.roles.add(RANK_ROLES[modality][rank]).catch(() => {});

    // Guardar en JSON
    setPlayerRank(user.id, modality, rank, interaction.user.id);
	generateRankingFile();
	await uploadPlayersToGitHub();
    await uploadRankingToGitHub();

	
    return interaction.editReply({
        content: `✅ Rango **${rank}** asignado a **${user.username}** en **${modality}**.`
    });
}


    // ============================
    // /admin setregion
    // ============================
    if (sub === "setregion") {
        const user = interaction.options.getUser("usuario");
		playersDB[user.id].avatar = user.avatar;
        savePlayersDB();
        const region = interaction.options.getString("region");

        updatePlayerInfo(user.id, playersDB[user.id]?.nick || "No registrado", region);
        generateRankingFile();
        await uploadPlayersToGitHub();
        await uploadRankingToGitHub();

        return interaction.reply({
            content: `🌍 Región de **${user.username}** actualizada a **${region}**.`,
            ephemeral: false
        });
    }

    // ============================
    // /admin setnick
    // ============================
    if (sub === "setnick") {
        const user = interaction.options.getUser("usuario");
		playersDB[user.id].avatar = user.avatar;
        savePlayersDB();
        const nick = interaction.options.getString("nick");

        updatePlayerInfo(user.id, nick, playersDB[user.id]?.region || "Desconocida");
		generateRankingFile();
        await uploadPlayersToGitHub();
        await uploadRankingToGitHub();

        return interaction.reply({
            content: `📝 Nick de **${user.username}** actualizado a **${nick}**.`,
            ephemeral: false
        });
    }

    // ============================
    // /admin removeplayer
    // ============================
    if (sub === "removeplayer") {
        const user = interaction.options.getUser("usuario");

        if (playersDB[user.id]) {
            delete playersDB[user.id];
            savePlayersDB();
			generateRankingFile();
			await uploadPlayersToGitHub();
            await uploadRankingToGitHub();
        }

        return interaction.reply({
            content: `🗑️ Jugador **${user.username}** eliminado de la base de datos.`,
            ephemeral: false
        });
    }

    // ============================
    // /admin setall
    // ============================
if (sub === "setall") {
    await interaction.deferReply({ ephemeral: false });

    const user = interaction.options.getUser("usuario");
	playersDB[user.id].avatar = user.avatar;
    savePlayersDB();
    const melee = interaction.options.getString("melee");
    const weapons = interaction.options.getString("weapons");
    const mixed = interaction.options.getString("mixed");

    const guildMember = await interaction.guild.members.fetch(user.id);

    // Remover rangos previos
    for (const r in RANK_ROLES.melee) {
        await guildMember.roles.remove(RANK_ROLES.melee[r]).catch(() => {});
    }
    for (const r in RANK_ROLES.weapons) {
        await guildMember.roles.remove(RANK_ROLES.weapons[r]).catch(() => {});
    }
    for (const r in RANK_ROLES.mixed) {
        await guildMember.roles.remove(RANK_ROLES.mixed[r]).catch(() => {});
    }

    // Asignar nuevos
    await guildMember.roles.add(RANK_ROLES.melee[melee]).catch(() => {});
    await guildMember.roles.add(RANK_ROLES.weapons[weapons]).catch(() => {});
    await guildMember.roles.add(RANK_ROLES.mixed[mixed]).catch(() => {});

    // Guardar en JSON
    setPlayerRank(user.id, "melee", melee, interaction.user.id);
    setPlayerRank(user.id, "weapons", weapons, interaction.user.id);
    setPlayerRank(user.id, "mixed", mixed, interaction.user.id);
	generateRankingFile();
    await uploadPlayersToGitHub();
    await uploadRankingToGitHub();



    return interaction.editReply({
        content:
            `📦 Rangos de **${user.username}** actualizados:\n` +
            `- Melee: **${melee}**\n` +
            `- Weapons: **${weapons}**\n` +
            `- Mixed: **${mixed}**`
    });
}

}   // 👈👈👈 ESTA ES LA LLAVE QUE FALTABA

    // ======================================================
    // SETUPVERIFY
    // ======================================================

    if (interaction.isChatInputCommand() && interaction.commandName === "setupverify") {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!member.roles.cache.has(FOUNDER_ROLE_ID)) {
            return interaction.reply({
                content: "⛔ Solo el Founder puede usar este comando.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("Verificación TIERS SF")
            .setDescription(
                "Ingresa tu región (SA, NA, EU) y tu Nick de Superfighters Deluxe.\n" +
                "Recibirás Verified + Unranked.\n" +
                "⚠️ Solo puedes registrarte una vez."
            )
            .setColor(0xFFD700);

        const button = new ButtonBuilder()
            .setCustomId("verify_button")
            .setLabel("Verificar")
            .setStyle(ButtonStyle.Primary);

        return interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(button)]
        });
    }

    // ======================================================
    // BOTÓN VERIFICAR
    // ======================================================

    if (interaction.isButton() && interaction.customId === "verify_button") {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.reply({
                content: "⛔ Ya estás verificado.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("verify_modal")
            .setTitle("Verificación TIERS");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("region_input")
                    .setLabel("Región (SA, NA, EU)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("nick_input")
                    .setLabel("Nick de Superfighters Deluxe")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );

        return interaction.showModal(modal);
    }

    // ======================================================
    // MODAL VERIFICACIÓN
    // ======================================================

    if (interaction.isModalSubmit() && interaction.customId === "verify_modal") {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.reply({
                content: "⛔ Ya estás verificado.",
                ephemeral: true
            });
        }

        const region = interaction.fields.getTextInputValue("region_input").toUpperCase();
        const nick = interaction.fields.getTextInputValue("nick_input");
		// Guardamos los datos del usuario en memoria
if (!client.userData) client.userData = {};
client.userData[interaction.user.id] = {
    region,
    nick
};

updatePlayerInfo(interaction.user.id, nick, region);


        if (!["SA", "NA", "EU"].includes(region)) {
            return interaction.reply({
                content: "⛔ Región inválida.",
                ephemeral: true
            });
        }

        const infoChannel = await client.channels.fetch(INFO_CHANNEL_ID);
        await infoChannel.send(
            `📌 **Nuevo usuario verificado**\n` +
            `Usuario: ${interaction.user}\n` +
            `Región: ${region}\nNick: ${nick}`
        );

        await member.roles.add(VERIFIED_ROLE_ID);
        await member.roles.add(UNRANKED_ROLE_ID);

        return interaction.reply({
            content: "✅ Verificación completada.",
            ephemeral: true
        });
    }

    // ======================================================
    // /LEAVE (TODOS)
    // ======================================================

    if (interaction.isChatInputCommand() && interaction.commandName === "leave") {
        for (const m in queues) {
            queues[m].players = queues[m].players.filter(p => p !== interaction.user.toString());
        }

        for (const m in queues) {
            if (queues[m].message) await updateQueueEmbed(m);
        }

        return interaction.reply({
            content: "✅ Saliste de todas las queues.",
            ephemeral: true
        });
    }

    // ======================================================
    // PERMISOS PARA TESTERS
    // ======================================================

    if (
        interaction.isChatInputCommand() &&
        ["queue", "tester", "next", "closeticket"].includes(interaction.commandName)
    ) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!member.roles.cache.has(TESTER_ROLE_ID)) {
            return interaction.reply({
                content: "⛔ Solo testers pueden usar este comando.",
                ephemeral: true
            });
        }
    }

    // ======================================================
    // /QUEUE
    // ======================================================

    if (interaction.isChatInputCommand() && interaction.commandName === "queue") {
        const sub = interaction.options.getSubcommand();
        const modality = interaction.options.getString("modality");

        if (sub === "open") {
			queues[modality].lastOpened = Math.floor(Date.now() / 1000);
            queues[modality].players = [];
            queues[modality].testers = [interaction.user.toString()];

            await updateQueueEmbed(modality);

            await interaction.deferReply({ ephemeral: true });
            await interaction.user.send(`Queue ${modality} abierta.`);
            return interaction.editReply({ content: `Queue ${modality} abierta.` });
        }

if (sub === "close") {
    const q = queues[modality];

    q.players = [];
    q.testers = [];

    const timestamp = q.lastOpened
        ? `<t:${q.lastOpened}:f>`
        : "No hay registros previos.";

    if (q.message) {
        const embed = new EmbedBuilder()
            .setTitle(`❌ Queue ${modality.toUpperCase()} cerrada`)
            .setDescription(
                "No hay testers activos.\n\n" +
                `**Última sesión abierta:**\n${timestamp}`
            )
            .setColor(0xFF0000);

        await q.message.edit({ embeds: [embed], components: [] });
        // NO borramos el mensaje, solo lo dejamos editado
    }

    return interaction.reply({
        content: `Queue ${modality} cerrada.`,
        ephemeral: true
    });
  }
}
    // ======================================================
    // /TESTER
    // ======================================================

    if (interaction.isChatInputCommand() && interaction.commandName === "tester") {
        const sub = interaction.options.getSubcommand();
        const modality = interaction.options.getString("modality");

        if (sub === "join") {
            if (!queues[modality].testers.includes(interaction.user.toString())) {
                queues[modality].testers.push(interaction.user.toString());
            }

            await updateQueueEmbed(modality);

            return interaction.reply({
                content: `Ahora sos tester en ${modality}.`,
                ephemeral: true
            });
        }

        if (sub === "leave") {
            queues[modality].testers = queues[modality].testers.filter(t => t !== interaction.user.toString());

            await updateQueueEmbed(modality);

            return interaction.reply({
                content: `Saliste como tester de ${modality}.`,
                ephemeral: true
            });
        }
	}
    // ======================================================
    // /NEXT — CREA TICKET
    // ======================================================

    if (interaction.isChatInputCommand() && interaction.commandName === "next") {
        const modality = interaction.options.getString("modality");

        if (queues[modality].players.length === 0) {
            return interaction.reply({
                content: "⛔ No hay jugadores en la queue.",
                ephemeral: true
            });
        }

        const playerMention = queues[modality].players.shift();
        await updateQueueEmbed(modality);

        const guild = interaction.guild;

        const ticketChannel = await guild.channels.create({
            name: `ticket-${modality}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: TICKETS_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                },
                {
                    id: playerMention.replace(/[<@!>]/g, ""),
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                }
            ]
        });

        tickets.set(ticketChannel.id, {
            testerId: interaction.user.id,
            playerId: playerMention.replace(/[<@!>]/g, ""),
            modality,
            selectedRank: null
        });

        const rankSelect = new StringSelectMenuBuilder()
            .setCustomId("rank_select")
            .setPlaceholder("Seleccionar rango final")
            .addOptions(
                Object.keys(RANK_ROLES[modality]).map(r => ({
                    label: r,
                    value: r
                }))
            );

        const finishButton = new ButtonBuilder()
            .setCustomId("finish_test")
            .setLabel("Finalizar test")
            .setStyle(ButtonStyle.Danger);

        const row1 = new ActionRowBuilder().addComponents(rankSelect);
        const row2 = new ActionRowBuilder().addComponents(finishButton);

        await ticketChannel.send({
            content: `${interaction.user} | ${playerMention}`,
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Ticket de evaluación - ${modality.toUpperCase()}`)
                    .setDescription("Jueguen el set. Luego el tester debe elegir el rango final y finalizar el test.")
                    .setColor(0x00AE86)
            ],
            components: [row1, row2]
        });

        return interaction.reply({
            content: `✅ Ticket creado: ${ticketChannel}`,
            ephemeral: true
        });
    }

    // ======================================================
    // /CLOSETICKET
    // ======================================================

    if (interaction.isChatInputCommand() && interaction.commandName === "closeticket") {
        const ticketData = tickets.get(interaction.channel.id);

        if (!ticketData) {
            return interaction.reply({
                content: "⛔ Este canal no es un ticket activo.",
                ephemeral: true
            });
        }

        tickets.delete(interaction.channel.id);

        await interaction.reply({
            content: "✅ Ticket cerrado.",
            ephemeral: true
        });

        return interaction.channel.delete().catch(() => {});
    }


// ============================
// /rank
// ============================
if (interaction.isChatInputCommand() && interaction.commandName === "rank") {
    const targetUser = interaction.options.getUser("usuario") || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);

    // 1. Verificación
    if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
        return interaction.reply({
            content: `⛔ **${targetUser.username}** no está verificado. Verifícate para poder ver tu rank.`,
            ephemeral: true
        });
    }

    // 2. Asegurar que el jugador existe en la base
    ensurePlayer(targetUser.id);
    const data = playersDB[targetUser.id];

    // 3. Obtener datos
    const region = data.region || "Desconocida";
    const melee = data.meleeRank || "Unranked";
    const weapons = data.weaponsRank || "Unranked";
    const mixed = data.mixedRank || "Unranked";
    const score = data.score || 0;

    // 4. Calcular posición en el ranking
    const rankingList = Object.entries(playersDB)
        .map(([id, d]) => ({
            id,
            score: d.score || 0
        }))
        .sort((a, b) => b.score - a.score);

    const position = rankingList.findIndex(p => p.id === targetUser.id) + 1;

    // 5. Embed
    const embed = new EmbedBuilder()
        .setTitle(`🏅 Rank de ${targetUser.username}`)
        .addFields(
            { name: "Región", value: region, inline: true },
            { name: "Posición Global", value: `#${position}`, inline: true },
            { name: "Score Total", value: `${score} puntos`, inline: true },
            { name: "\u200B", value: "\u200B" },
            { name: "Melee", value: melee, inline: true },
            { name: "Weapons", value: weapons, inline: true },
            { name: "Mixed", value: mixed, inline: true }
        )
        .setColor(0xFFD700);

    return interaction.reply({ embeds: [embed] });
}
// ============================
// /ranking
// ============================
if (interaction.isChatInputCommand() && interaction.commandName === "ranking") {

    // Si no hay jugadores en la base
    const allPlayers = Object.entries(playersDB);
    if (allPlayers.length === 0) {
        return interaction.reply({
            content: "⚠️ No hay jugadores registrados aún.",
            ephemeral: true
        });
    }

    // Ordenar por score (descendente)
    const rankingList = allPlayers
        .map(([id, data]) => ({
            id,
            nick: data.nick || "Sin nick",
            region: data.region || "Desconocida",
            melee: data.meleeRank || "Unranked",
            weapons: data.weaponsRank || "Unranked",
            mixed: data.mixedRank || "Unranked",
            score: data.score || 0
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10

    // Construir texto del ranking
    let text = rankingList
        .map((p, i) =>
            `**#${i + 1} — ${p.nick}** (${p.region})\n` +
            `• Melee: **${p.melee}**\n` +
            `• Weapons: **${p.weapons}**\n` +
            `• Mixed: **${p.mixed}**\n` +
            `• Score Total: **${p.score}**\n`
        )
        .join("\n");

    const embed = new EmbedBuilder()
        .setTitle("🏆 Ranking General TIERS SF")
        .setDescription(text)
        .setColor(0xFFD700);

    return interaction.reply({ embeds: [embed] });
}
});

// ======================================================
// INTERACCIONES: BOTONES / MENÚS (QUEUES + TICKETS)
// ======================================================

client.on(Events.InteractionCreate, async interaction => {
    // Botón unirse a queue
    if (interaction.isButton() && interaction.customId.startsWith("join_")) {
        const modality = interaction.customId.split("_")[1];

        if (!queues[modality]) {
            return interaction.reply({
                content: "⛔ Modalidad inválida.",
                ephemeral: true
            });
        }

        if (!queues[modality].players.includes(interaction.user.toString())) {
            queues[modality].players.push(interaction.user.toString());
        }

        await updateQueueEmbed(modality);

        return interaction.reply({
            content: `✅ Te uniste a la queue ${modality}.`,
            ephemeral: true
        });
    }

    // Select de rango en ticket
    if (interaction.isStringSelectMenu() && interaction.customId === "rank_select") {
        const ticketData = tickets.get(interaction.channel.id);

        if (!ticketData) {
            return interaction.reply({
                content: "⛔ Este canal no es un ticket activo.",
                ephemeral: true
            });
        }

        if (interaction.user.id !== ticketData.testerId) {
            return interaction.reply({
                content: "⛔ Solo el tester asignado puede elegir el rango.",
                ephemeral: true
            });
        }

        const selectedRank = interaction.values[0];
        ticketData.selectedRank = selectedRank;
        tickets.set(interaction.channel.id, ticketData);

        return interaction.reply({
            content: `✅ Rango seleccionado: **${selectedRank}**. Ahora presioná "Finalizar test".`,
            ephemeral: true
        });
    }

    // Botón finalizar test
    if (interaction.isButton() && interaction.customId === "finish_test") {
        const ticketData = tickets.get(interaction.channel.id);

        if (!ticketData) {
            return interaction.reply({
                content: "⛔ Este canal no es un ticket activo.",
                ephemeral: true
            });
        }

        if (interaction.user.id !== ticketData.testerId) {
            return interaction.reply({
                content: "⛔ Solo el tester asignado puede finalizar el test.",
                ephemeral: true
            });
        }

        if (!ticketData.selectedRank) {
            return interaction.reply({
                content: "⛔ Primero seleccioná un rango en el menú.",
                ephemeral: true
            });
        }

        const guild = interaction.guild;
        const player = await guild.members.fetch(ticketData.playerId).catch(() => null);

let previousRank = "Unranked";

// Buscar si tenía algún rango previo en esa modalidad
const modalityRoles = RANK_ROLES[ticketData.modality];
for (const rankName in modalityRoles) {
    const roleId = modalityRoles[rankName];
    if (player.roles.cache.has(roleId)) {
        previousRank = rankName;
        await player.roles.remove(roleId).catch(() => {});
    }
}

// Asignar el nuevo rango
const newRoleId = RANK_ROLES[ticketData.modality][ticketData.selectedRank];
setPlayerRank(
    ticketData.playerId,
    ticketData.modality,
    ticketData.selectedRank,
    ticketData.testerId
);
await player.roles.add(newRoleId).catch(() => {});


        const logChannel = await client.channels.fetch(RESULTS_LOG_CHANNEL_ID);
const resultadosChannel = await client.channels.fetch(RESULTS_LOG_CHANNEL_ID);

let userInfo = client.userData?.[ticketData.playerId];

if (!userInfo) {
    // Buscar en info-users el mensaje donde se registró
    const infoChannel = await client.channels.fetch(INFO_CHANNEL_ID);
    const messages = await infoChannel.messages.fetch({ limit: 50 });

    const msg = messages.find(m => m.content.includes(ticketData.playerId));

    if (msg) {
        const lines = msg.content.split("\n");
        const regionLine = lines.find(l => l.includes("Región:"));
        const nickLine = lines.find(l => l.includes("Nick:"));

        userInfo = {
            region: regionLine ? regionLine.replace("Región:", "").trim() : "Desconocida",
            nick: nickLine ? nickLine.replace("Nick:", "").trim() : "No registrado"
        };
    } else {
        userInfo = {
            region: "Desconocida",
            nick: "No registrado"
        };
    }
}


const resultEmbed = new EmbedBuilder()
    .setTitle("🏆 TIERS SF — Resultado de Test")
    .addFields(
        { name: "Tester", value: `<@${ticketData.testerId}>`, inline: true },
        { name: "Región", value: userInfo.region, inline: true },
        { name: "Username", value: userInfo.nick, inline: true },
        { name: "Modality", value: ticketData.modality.toUpperCase(), inline: true },
        { name: "Previous Rank", value: previousRank, inline: true },
        { name: "Rank Earned", value: ticketData.selectedRank, inline: true }
    )
    .setColor(0xFFD700);

await resultadosChannel.send({ embeds: [resultEmbed] });


        tickets.delete(interaction.channel.id);

        await interaction.reply({
            content: "✅ Test finalizado. El ticket será cerrado.",
            ephemeral: true
        });

        return interaction.channel.delete().catch(() => {});
    }
});

// ======================================================
// LOGIN
// ======================================================


client.login(TOKEN);






