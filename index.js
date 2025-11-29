const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');

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
    if (level >= roleData.level) {
      currentRole = roleData;
    }
  }
  return currentRole;
}

function getNextRole(level) {
  for (const roleData of LEVEL_ROLES) {
    if (level < roleData.level) {
      return roleData;
    }
  }
  return null;
}

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
    .setDescription(`🌸 **Hey ${member}!** 🌸\n\n꒰ᐢ. .ᐢ꒱ We're so happy you're here!\n\n✧˖°. Make yourself at home and enjoy your stay with us! .°˖✧\n\n💕 We hope you find this place as cozy and welcoming as we do~ 💕`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '🎀 Member', value: `\`${member.user.tag}\``, inline: true },
      { name: '🌟 You are member', value: `\`#${member.guild.memberCount}\``, inline: true }
    )
    .setImage('https://media.tenor.com/images/0e32deb1ee44e157a71555bf9db53c3a/tenor.gif')
    .setFooter({ text: '♡ We hope you have a wonderful time here! ♡' })
    .setTimestamp();

  try {
    await welcomeChannel.send({ embeds: [welcomeEmbed] });
  } catch (error) {
    console.error('Failed to send welcome message:', error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guildId = message.guild.id;
  const odId = message.author.id;
  
  if (!userLevels[guildId]) userLevels[guildId] = {};
  if (!userLevels[guildId][odId]) {
    userLevels[guildId][odId] = { xp: 0, level: 0, lastMessage: 0 };
  }
  
  const userData = userLevels[guildId][odId];
  const now = Date.now();
  
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
        .setDescription(`🎉 Congratulations ${message.author}!\n\n🌟 You've reached **Level ${newLevel}**!`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
      
      if (roleData) {
        levelUpEmbed.addFields({ name: `${roleData.emoji} Current Rank`, value: `\`${roleData.name}\``, inline: true });
      }
      if (nextRole) {
        levelUpEmbed.addFields({ name: '🎯 Next Rank', value: `\`${nextRole.name}\` at Level ${nextRole.level}`, inline: true });
      }
      
      levelUpEmbed.setFooter({ text: '♡ Keep chatting to level up! ♡' });
      
      try {
        const levelUpChannel = message.guild.channels.cache.get(LEVELUP_CHANNEL_ID);
        if (levelUpChannel) {
          await levelUpChannel.send({ embeds: [levelUpEmbed] });
        }
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

  const hasAdminPermission = message.member.permissions.has(PermissionFlagsBits.Administrator);
  const hasModPermission = message.member.permissions.has(PermissionFlagsBits.ModerateMembers);
  const hasManageMessages = message.member.permissions.has(PermissionFlagsBits.ManageMessages);
  const hasManageRoles = message.member.permissions.has(PermissionFlagsBits.ManageRoles);
  const hasManageChannels = message.member.permissions.has(PermissionFlagsBits.ManageChannels);
  const hasKickMembers = message.member.permissions.has(PermissionFlagsBits.KickMembers);
  const hasBanMembers = message.member.permissions.has(PermissionFlagsBits.BanMembers);

  switch (command) {
    case 'level':
    case 'rank':
      const levelMember = message.mentions.members.first() || message.member;
      const levelGuildId = message.guild.id;
      const levelUserId = levelMember.id;
      
      if (!userLevels[levelGuildId]) userLevels[levelGuildId] = {};
      if (!userLevels[levelGuildId][levelUserId]) {
        userLevels[levelGuildId][levelUserId] = { xp: 0, level: 0, lastMessage: 0 };
      }
      
      const levelData = userLevels[levelGuildId][levelUserId];
      const currentRole = getRoleForLevel(levelData.level);
      const nextRoleData = getNextRole(levelData.level);
      const xpNeeded = nextRoleData ? getXpForLevel(nextRoleData.level) - levelData.xp : 0;
      
      const progressBar = (() => {
        if (!nextRoleData) return '▓▓▓▓▓▓▓▓▓▓ MAX';
        const currentLevelXp = getXpForLevel(levelData.level);
        const nextLevelXp = getXpForLevel(levelData.level + 1);
        const progress = (levelData.xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
        const filled = Math.floor(progress * 10);
        return '▓'.repeat(filled) + '░'.repeat(10 - filled);
      })();
      
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
      
      levelEmbed.setFooter({ text: '♡ Keep chatting to level up! ♡' });
      await message.reply({ embeds: [levelEmbed] });
      break;

    case 'leaderboard':
    case 'lb':
      const lbGuildId = message.guild.id;
      if (!userLevels[lbGuildId]) {
        return message.reply('No one has earned any XP yet!');
      }
      
      const sorted = Object.entries(userLevels[lbGuildId])
        .sort(([, a], [, b]) => b.xp - a.xp)
        .slice(0, 10);
      
      const leaderboardEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('✨ Server Leaderboard ✨')
        .setDescription('🏆 Top 10 most active members!\n\n' + 
          (await Promise.all(sorted.map(async ([odId, data], index) => {
            const medal = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
            try {
              const user = await client.users.fetch(odId);
              return `${medal} ${user.username} — Level \`${data.level}\` • \`${data.xp} XP\``;
            } catch {
              return `${medal} Unknown User — Level \`${data.level}\` • \`${data.xp} XP\``;
            }
          }))).join('\n'))
        .setFooter({ text: '♡ Keep chatting to climb the ranks! ♡' })
        .setTimestamp();
      
      await message.reply({ embeds: [leaderboardEmbed] });
      break;

    case 'levels':
    case 'ranks':
      const ranksEmbed = new EmbedBuilder()
        .setColor(0xFFB6C1)
        .setTitle('✨ Level Roles ✨')
        .setDescription('🌟 Here are all the ranks you can earn!\n\n' +
          LEVEL_ROLES.map(r => `${r.emoji} **${r.name}** — Level ${r.level}`).join('\n'))
        .setFooter({ text: '♡ Chat to earn XP and unlock roles! ♡' });
      await message.reply({ embeds: [ranksEmbed] });
      break;

    case 'help':
      const helpEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Admin Bot Commands')
        .setDescription('Here are all available commands:')
        .addFields(
          { name: 'Leveling', value: '`!level [@user]` - Check your or someone\'s level\n`!leaderboard` - View the server leaderboard\n`!levels` - View all level roles' },
          { name: 'Moderation', value: '`!kick @user [reason]` - Kick a member\n`!ban @user [reason]` - Ban a member\n`!unban <userID>` - Unban a user\n`!timeout @user <minutes> [reason]` - Timeout a member\n`!untimeout @user` - Remove timeout from a member' },
          { name: 'Message Management', value: '`!clear <amount>` - Delete messages (1-100)\n`!purge @user <amount>` - Delete messages from a specific user' },
          { name: 'Role Management', value: '`!addrole @user @role` - Add a role to a member\n`!removerole @user @role` - Remove a role from a member\n`!createrole <name> [color]` - Create a new role\n`!deleterole @role` - Delete a role' },
          { name: 'Channel Management', value: '`!createchannel <name> [type]` - Create a channel (text/voice)\n`!deletechannel #channel` - Delete a channel\n`!lock [#channel]` - Lock a channel\n`!unlock [#channel]` - Unlock a channel' },
          { name: 'Info', value: '`!serverinfo` - Display server information\n`!userinfo [@user]` - Display user information' }
        )
        .setFooter({ text: 'Admin Bot - Server Administration' });
      await message.reply({ embeds: [helpEmbed] });
      break;

    case 'kick':
      if (!hasKickMembers && !hasAdminPermission) {
        return message.reply('You do not have permission to kick members.');
      }
      const kickMember = message.mentions.members.first();
      if (!kickMember) {
        return message.reply('Please mention a member to kick.');
      }
      if (!kickMember.kickable) {
        return message.reply('I cannot kick this member. They may have higher permissions than me.');
      }
      const kickReason = args.slice(1).join(' ') || 'No reason provided';
      try {
        await kickMember.kick(kickReason);
        await message.reply(`Successfully kicked ${kickMember.user.tag}. Reason: ${kickReason}`);
      } catch (error) {
        await message.reply('Failed to kick the member.');
        console.error(error);
      }
      break;

    case 'ban':
      if (!hasBanMembers && !hasAdminPermission) {
        return message.reply('You do not have permission to ban members.');
      }
      const banMember = message.mentions.members.first();
      if (!banMember) {
        return message.reply('Please mention a member to ban.');
      }
      if (!banMember.bannable) {
        return message.reply('I cannot ban this member. They may have higher permissions than me.');
      }
      const banReason = args.slice(1).join(' ') || 'No reason provided';
      try {
        await banMember.ban({ reason: banReason });
        await message.reply(`Successfully banned ${banMember.user.tag}. Reason: ${banReason}`);
      } catch (error) {
        await message.reply('Failed to ban the member.');
        console.error(error);
      }
      break;

    case 'unban':
      if (!hasBanMembers && !hasAdminPermission) {
        return message.reply('You do not have permission to unban members.');
      }
      const unbanId = args[0];
      if (!unbanId) {
        return message.reply('Please provide a user ID to unban.');
      }
      try {
        await message.guild.members.unban(unbanId);
        await message.reply(`Successfully unbanned user with ID: ${unbanId}`);
      } catch (error) {
        await message.reply('Failed to unban the user. Make sure the ID is correct.');
        console.error(error);
      }
      break;

    case 'timeout':
      if (!hasModPermission && !hasAdminPermission) {
        return message.reply('You do not have permission to timeout members.');
      }
      const timeoutMember = message.mentions.members.first();
      if (!timeoutMember) {
        return message.reply('Please mention a member to timeout.');
      }
      const timeoutMinutes = parseInt(args[1]);
      if (isNaN(timeoutMinutes) || timeoutMinutes < 1) {
        return message.reply('Please provide a valid timeout duration in minutes.');
      }
      const timeoutReason = args.slice(2).join(' ') || 'No reason provided';
      try {
        await timeoutMember.timeout(timeoutMinutes * 60 * 1000, timeoutReason);
        await message.reply(`Successfully timed out ${timeoutMember.user.tag} for ${timeoutMinutes} minutes. Reason: ${timeoutReason}`);
      } catch (error) {
        await message.reply('Failed to timeout the member.');
        console.error(error);
      }
      break;

    case 'untimeout':
      if (!hasModPermission && !hasAdminPermission) {
        return message.reply('You do not have permission to remove timeouts.');
      }
      const untimeoutMember = message.mentions.members.first();
      if (!untimeoutMember) {
        return message.reply('Please mention a member to remove timeout from.');
      }
      try {
        await untimeoutMember.timeout(null);
        await message.reply(`Successfully removed timeout from ${untimeoutMember.user.tag}.`);
      } catch (error) {
        await message.reply('Failed to remove timeout from the member.');
        console.error(error);
      }
      break;

    case 'clear':
      if (!hasManageMessages && !hasAdminPermission) {
        return message.reply('You do not have permission to manage messages.');
      }
      const clearAmount = parseInt(args[0]);
      if (isNaN(clearAmount) || clearAmount < 1 || clearAmount > 100) {
        return message.reply('Please provide a number between 1 and 100.');
      }
      try {
        const deleted = await message.channel.bulkDelete(clearAmount + 1, true);
        const reply = await message.channel.send(`Deleted ${deleted.size - 1} messages.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
      } catch (error) {
        await message.reply('Failed to delete messages. Messages older than 14 days cannot be bulk deleted.');
        console.error(error);
      }
      break;

    case 'purge':
      if (!hasManageMessages && !hasAdminPermission) {
        return message.reply('You do not have permission to manage messages.');
      }
      const purgeUser = message.mentions.users.first();
      const purgeAmount = parseInt(args[1]);
      if (!purgeUser) {
        return message.reply('Please mention a user whose messages you want to delete.');
      }
      if (isNaN(purgeAmount) || purgeAmount < 1 || purgeAmount > 100) {
        return message.reply('Please provide a number between 1 and 100.');
      }
      try {
        const messages = await message.channel.messages.fetch({ limit: 100 });
        const userMessages = messages.filter(m => m.author.id === purgeUser.id).first(purgeAmount);
        await message.channel.bulkDelete(userMessages, true);
        const reply = await message.channel.send(`Deleted ${userMessages.length} messages from ${purgeUser.tag}.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
      } catch (error) {
        await message.reply('Failed to delete messages.');
        console.error(error);
      }
      break;

    case 'addrole':
      if (!hasManageRoles && !hasAdminPermission) {
        return message.reply('You do not have permission to manage roles.');
      }
      const addRoleMember = message.mentions.members.first();
      const addRole = message.mentions.roles.first();
      if (!addRoleMember || !addRole) {
        return message.reply('Please mention a member and a role. Usage: `!addrole @user @role`');
      }
      if (LEVEL_ROLES.some(r => r.name === addRole.name)) {
        return message.reply('This is a level role and can only be earned through leveling up!');
      }
      if (addRole.position >= message.guild.members.me.roles.highest.position) {
        return message.reply('I cannot assign this role as it is higher than or equal to my highest role.');
      }
      try {
        await addRoleMember.roles.add(addRole);
        await message.reply(`Successfully added role ${addRole.name} to ${addRoleMember.user.tag}.`);
      } catch (error) {
        await message.reply('Failed to add the role.');
        console.error(error);
      }
      break;

    case 'removerole':
      if (!hasManageRoles && !hasAdminPermission) {
        return message.reply('You do not have permission to manage roles.');
      }
      const removeRoleMember = message.mentions.members.first();
      const removeRole = message.mentions.roles.first();
      if (!removeRoleMember || !removeRole) {
        return message.reply('Please mention a member and a role. Usage: `!removerole @user @role`');
      }
      if (LEVEL_ROLES.some(r => r.name === removeRole.name)) {
        return message.reply('This is a level role and cannot be manually removed!');
      }
      if (removeRole.position >= message.guild.members.me.roles.highest.position) {
        return message.reply('I cannot remove this role as it is higher than or equal to my highest role.');
      }
      try {
        await removeRoleMember.roles.remove(removeRole);
        await message.reply(`Successfully removed role ${removeRole.name} from ${removeRoleMember.user.tag}.`);
      } catch (error) {
        await message.reply('Failed to remove the role.');
        console.error(error);
      }
      break;

    case 'createrole':
      if (!hasManageRoles && !hasAdminPermission) {
        return message.reply('You do not have permission to manage roles.');
      }
      const roleName = args[0];
      const roleColor = args[1] || 'Default';
      if (!roleName) {
        return message.reply('Please provide a name for the role. Usage: `!createrole <name> [color]`');
      }
      if (LEVEL_ROLES.some(r => r.name.toLowerCase() === roleName.toLowerCase())) {
        return message.reply('You cannot create a role with the same name as a level role!');
      }
      try {
        const newRole = await message.guild.roles.create({
          name: roleName,
          color: roleColor !== 'Default' ? roleColor : undefined,
          reason: `Created by ${message.author.tag}`
        });
        await message.reply(`Successfully created role: ${newRole.name}`);
      } catch (error) {
        await message.reply('Failed to create the role. Make sure the color is valid (e.g., #FF0000 or Red).');
        console.error(error);
      }
      break;

    case 'deleterole':
      if (!hasManageRoles && !hasAdminPermission) {
        return message.reply('You do not have permission to manage roles.');
      }
      const deleteRole = message.mentions.roles.first();
      if (!deleteRole) {
        return message.reply('Please mention a role to delete. Usage: `!deleterole @role`');
      }
      if (LEVEL_ROLES.some(r => r.name === deleteRole.name)) {
        return message.reply('You cannot delete a level role!');
      }
      if (deleteRole.position >= message.guild.members.me.roles.highest.position) {
        return message.reply('I cannot delete this role as it is higher than or equal to my highest role.');
      }
      try {
        const deletedRoleName = deleteRole.name;
        await deleteRole.delete(`Deleted by ${message.author.tag}`);
        await message.reply(`Successfully deleted role: ${deletedRoleName}`);
      } catch (error) {
        await message.reply('Failed to delete the role.');
        console.error(error);
      }
      break;

    case 'createchannel':
      if (!hasManageChannels && !hasAdminPermission) {
        return message.reply('You do not have permission to manage channels.');
      }
      const channelName = args[0];
      const channelType = args[1]?.toLowerCase() || 'text';
      if (!channelName) {
        return message.reply('Please provide a name for the channel. Usage: `!createchannel <name> [text/voice]`');
      }
      try {
        const newChannel = await message.guild.channels.create({
          name: channelName,
          type: channelType === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
          reason: `Created by ${message.author.tag}`
        });
        await message.reply(`Successfully created channel: ${newChannel}`);
      } catch (error) {
        await message.reply('Failed to create the channel.');
        console.error(error);
      }
      break;

    case 'deletechannel':
      if (!hasManageChannels && !hasAdminPermission) {
        return message.reply('You do not have permission to manage channels.');
      }
      const deleteChannel = message.mentions.channels.first();
      if (!deleteChannel) {
        return message.reply('Please mention a channel to delete. Usage: `!deletechannel #channel`');
      }
      try {
        const deletedChannelName = deleteChannel.name;
        await deleteChannel.delete(`Deleted by ${message.author.tag}`);
        await message.reply(`Successfully deleted channel: #${deletedChannelName}`);
      } catch (error) {
        await message.reply('Failed to delete the channel.');
        console.error(error);
      }
      break;

    case 'lock':
      if (!hasManageChannels && !hasAdminPermission) {
        return message.reply('You do not have permission to manage channels.');
      }
      const lockChannel = message.mentions.channels.first() || message.channel;
      try {
        await lockChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: false
        });
        await message.reply(`Successfully locked ${lockChannel}.`);
      } catch (error) {
        await message.reply('Failed to lock the channel.');
        console.error(error);
      }
      break;

    case 'unlock':
      if (!hasManageChannels && !hasAdminPermission) {
        return message.reply('You do not have permission to manage channels.');
      }
      const unlockChannel = message.mentions.channels.first() || message.channel;
      try {
        await unlockChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: null
        });
        await message.reply(`Successfully unlocked ${unlockChannel}.`);
      } catch (error) {
        await message.reply('Failed to unlock the channel.');
        console.error(error);
      }
      break;

    case 'serverinfo':
      const serverEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(message.guild.name)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: 'Server ID', value: message.guild.id, inline: true },
          { name: 'Owner', value: `<@${message.guild.ownerId}>`, inline: true },
          { name: 'Members', value: `${message.guild.memberCount}`, inline: true },
          { name: 'Channels', value: `${message.guild.channels.cache.size}`, inline: true },
          { name: 'Roles', value: `${message.guild.roles.cache.size}`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.tag}` });
      await message.reply({ embeds: [serverEmbed] });
      break;

    case 'userinfo':
      const infoMember = message.mentions.members.first() || message.member;
      const userEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(infoMember.user.tag)
        .setThumbnail(infoMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User ID', value: infoMember.id, inline: true },
          { name: 'Nickname', value: infoMember.nickname || 'None', inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(infoMember.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(infoMember.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Roles', value: infoMember.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(', ') || 'None', inline: false }
        )
        .setFooter({ text: `Requested by ${message.author.tag}` });
      await message.reply({ embeds: [userEmbed] });
      break;
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
