const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const express = require('express');

// -------------------- Tiny Web Server --------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// -------------------- Discord Bot --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const PREFIX = '!';
const WELCOME_CHANNEL_ID = '1443975778533376020';
const LEVELUP_CHANNEL_ID = '1443987219567349841';
const LEVELS_FILE = './levels.json';

const LEVEL_ROLES = [
  { level: 1, name: 'Novice Creator', color: 0x90EE90, emoji: '🌱' },
  { level: 5, name: 'Apprentice', color: 0x87CEEB, emoji: '☁️' },
  { level: 10, name: 'Aesthetic Explorer', color: 0xFFB6C1, emoji: '🌸' },
  { level: 15, name: 'Creative Enthusiast', color: 0x9370DB, emoji: '💜' },
  { level: 20, name: 'Master of Vibes', color: 0xFFD700, emoji: '✨' },
  { level: 30, name: 'Legendary Icon', color: 0xFF6B6B, emoji: '🌈' }
];

let userLevels = {};

// -------------------- Level Data --------------------
function loadLevels() {
  try {
    if (fs.existsSync(LEVELS_FILE)) {
      userLevels = JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading levels:', error);
    userLevels = {};
  }
}

function saveLevels() {
  try {
    fs.writeFileSync(LEVELS_FILE, JSON.stringify(userLevels, null, 2));
  } catch (error) {
    console.error('Error saving levels:', error);
  }
}

function getXpForLevel(level) {
  return level * level * 100;
}

function getLevelFromXp(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function getUserData(guildId, odId) {
  if (!userLevels[guildId]) userLevels[guildId] = {};
  if (!userLevels[guildId][odId]) {
    userLevels[guildId][odId] = { xp: 0, level: 0, lastMessage: 0 };
  }
  return userLevels[guildId][odId];
}

async function checkAndAssignRoles(member, newLevel, oldLevel) {
  const guild = member.guild;

  for (const roleData of LEVEL_ROLES) {
    let role = guild.roles.cache.find(r => r.name === roleData.name);
    if (!role) {
      try {
        role = await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          reason: 'Level system role'
        });
        console.log(`Created role: ${roleData.name}`);
      } catch (error) {
        console.error(`Failed to create role ${roleData.name}:`, error);
        continue;
      }
    }

    if (newLevel >= roleData.level && !member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role);
      } catch (error) {
        console.error(`Failed to add role ${roleData.name}:`, error);
      }
    }
  }
}

function getRoleForLevel(level) {
  let currentRole = null;
  for (const roleData of LEVEL_ROLES) {
    if (level >= roleData.level) currentRole = roleData;
  }
  return currentRole;
}

function getNextRole(level) {
  for (const roleData of LEVEL_ROLES) {
    if (level < roleData.level) return roleData;
  }
  return null;
}

// -------------------- Bot Events --------------------
client.once('ready', () => {
  console.log(`Bot is online! Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} server(s)`);
  loadLevels();
});

client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!welcomeChannel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0xFFB6C1)
    .setTitle('✨ Welcome to the Server! ✨')
    .setDescription(`🌸 **Hey ${member}!** 🌸\n\nWe're so happy you're here! Make yourself at home!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: '♡ Enjoy your stay! ♡' })
    .setTimestamp();

  try {
    await welcomeChannel.send({ embeds: [welcomeEmbed] });
  } catch (error) {
    console.error('Failed to send welcome message:', error);
  }
});

// -------------------- Message Handling --------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const odId = message.author.id;
  const userData = getUserData(guildId, odId);
  const now = Date.now();

  // -------------------- Leveling System --------------------
  if (now - userData.lastMessage > 60000) {
    const xpGain = Math.floor(Math.random() * 15) + 15;
    userData.xp += xpGain;
    userData.lastMessage = now;

    const oldLevel = userData.level;
    const newLevel = getLevelFromXp(userData.xp);

    if (newLevel > oldLevel) {
      userData.level = newLevel;

      const roleData = getRoleForLevel(newLevel);
      const nextRole = getNextRole(newLevel);

      const levelUpEmbed = new EmbedBuilder()
        .setColor(0xFFB6C1)
        .setTitle('✨ Level Up! ✨')
        .setDescription(`🎉 Congratulations ${message.author}!\nYou've reached **Level ${newLevel}**!`);

      if (roleData) levelUpEmbed.addFields({ name: `${roleData.emoji} Current Rank`, value: `\`${roleData.name}\``, inline: true });
      if (nextRole) levelUpEmbed.addFields({ name: '🎯 Next Rank', value: `\`${nextRole.name}\` at Level ${nextRole.level}`, inline: true });

      try {
        const levelUpChannel = message.guild.channels.cache.get(LEVELUP_CHANNEL_ID);
        if (levelUpChannel) await levelUpChannel.send({ embeds: [levelUpEmbed] });
        await checkAndAssignRoles(message.member, newLevel, oldLevel);
      } catch (error) {
        console.error('Error sending level up message:', error);
      }
    }

    saveLevels();
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // -------------------- Command Handling --------------------
  switch (command) {
    case 'level':
      {
        const levelMember = message.mentions.members.first() || message.member;
        const levelData = getUserData(message.guild.id, levelMember.id);
        const currentRole = getRoleForLevel(levelData.level);
        const nextRoleData = getNextRole(levelData.level);
        const xpNeeded = nextRoleData ? getXpForLevel(nextRoleData.level) - levelData.xp : 0;
        const progressBar = nextRoleData
          ? '▓'.repeat(Math.floor((levelData.xp - getXpForLevel(levelData.level)) / (getXpForLevel(levelData.level + 1) - getXpForLevel(levelData.level)) * 10)) +
            '░'.repeat(10 - Math.floor((levelData.xp - getXpForLevel(levelData.level)) / (getXpForLevel(levelData.level + 1) - getXpForLevel(levelData.level)) * 10))
          : 'MAX';

        const levelEmbed = new EmbedBuilder()
          .setColor(currentRole ? currentRole.color : 0xFFB6C1)
          .setTitle(`✨ ${levelMember.user.username}'s Profile ✨`)
          .setThumbnail(levelMember.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🌟 Level', value: `\`${levelData.level}\``, inline: true },
            { name: '💫 Total XP', value: `\`${levelData.xp}\``, inline: true },
            { name: `${currentRole ? currentRole.emoji : '🌱'} Current Rank`, value: `\`${currentRole ? currentRole.name : 'No Rank Yet'}\``, inline: true }
          );

        if (nextRoleData) {
          levelEmbed.addFields(
            { name: '🎯 Next Rank', value: `\`${nextRoleData.name}\` (Level ${nextRoleData.level})`, inline: true },
            { name: '📊 Progress', value: `${progressBar}`, inline: true },
            { name: '✨ XP Needed', value: `\`${xpNeeded}\``, inline: true }
          );
        } else {
          levelEmbed.addFields({ name: '👑 Status', value: '`Maximum Level Reached!`', inline: false });
        }

        await message.reply({ embeds: [levelEmbed] });
      }
      break;

    // -------------------- Moderation Commands --------------------
    case 'kick':
      {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
          return message.reply("❌ You don't have permission to kick members!");

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to kick.');
        if (!member.kickable) return message.reply('❌ I cannot kick this member.');

        const reason = args.slice(1).join(' ') || 'No reason provided';
        await member.kick(reason);
        message.reply(`✅ Successfully kicked ${member.user.tag} for: ${reason}`);
      }
      break;

    case 'ban':
      {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
          return message.reply("❌ You don't have permission to ban members!");

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to ban.');
        if (!member.bannable) return message.reply('❌ I cannot ban this member.');

        const reason = args.slice(1).join(' ') || 'No reason provided';
        await member.ban({ reason });
        message.reply(`✅ Successfully banned ${member.user.tag} for: ${reason}`);
      }
      break;

    case 'mute':
      {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
          return message.reply("❌ You don't have permission to mute members!");

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to mute.');

        let muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
        if (!muteRole) {
          try {
            muteRole = await message.guild.roles.create({
              name: 'Muted',
              permissions: [],
              reason: 'Mute role for muting members'
            });

            for (const channel of message.guild.channels.cache.values()) {
              await channel.permissionOverwrites.edit(muteRole, {
                SendMessages: false,
                AddReactions: false,
                Speak: false
              });
            }
          } catch (error) {
            console.error('Error creating mute role:', error);
            return message.reply('❌ Failed to create mute role.');
          }
        }

        await member.roles.add(muteRole);
        message.reply(`✅ ${member.user.tag} has been muted.`);
      }
      break;

    case 'unmute':
      {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
          return message.reply("❌ You don't have permission to unmute members!");

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to unmute.');

        const muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
        if (!muteRole || !member.roles.cache.has(muteRole.id))
          return message.reply('❌ This member is not muted.');

        await member.roles.remove(muteRole);
        message.reply(`✅ ${member.user.tag} has been unmuted.`);
      }
      break;

    default:
      break;
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
