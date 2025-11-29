# Discord Admin Bot

## Overview
A Discord bot for server administration with moderation and management features.

## Project Structure
- `index.js` - Main bot file with all administration commands
- `package.json` - Node.js dependencies

## Commands

### Moderation
- `!kick @user [reason]` - Kick a member
- `!ban @user [reason]` - Ban a member
- `!unban <userID>` - Unban a user
- `!timeout @user <minutes> [reason]` - Timeout a member
- `!untimeout @user` - Remove timeout from a member

### Message Management
- `!clear <amount>` - Delete messages (1-100)
- `!purge @user <amount>` - Delete messages from a specific user

### Role Management
- `!addrole @user @role` - Add a role to a member
- `!removerole @user @role` - Remove a role from a member
- `!createrole <name> [color]` - Create a new role
- `!deleterole @role` - Delete a role

### Channel Management
- `!createchannel <name> [type]` - Create a channel (text/voice)
- `!deletechannel #channel` - Delete a channel
- `!lock [#channel]` - Lock a channel
- `!unlock [#channel]` - Unlock a channel

### Info
- `!serverinfo` - Display server information
- `!userinfo [@user]` - Display user information
- `!help` - Show all available commands

### Leveling System
- `!level [@user]` - Check your or someone's level and XP
- `!leaderboard` - View the top 10 most active members
- `!levels` - View all available level roles

### Level Roles (Earned Only)
| Level | Role | Color |
|-------|------|-------|
| 1 | Novice Creator 🌱 | Light Green |
| 5 | Apprentice ☁️ | Sky Blue |
| 10 | Aesthetic Explorer 🌸 | Pink |
| 15 | Creative Enthusiast 💜 | Purple |
| 20 | Master of Vibes ✨ | Gold |
| 30 | Legendary Icon 🌈 | Rainbow Red |

*These roles cannot be manually given - they must be earned through chatting!*

### Automatic Features
- **Welcome Messages** - Sends a pink aesthetic welcome embed with the new member's profile picture when someone joins (posts in channel ID: 1443975778533376020)
- **XP System** - Members earn 15-30 XP per message (1 minute cooldown between XP gains)
- **Level Up Notifications** - Beautiful embeds announce when members level up
- **Auto Role Assignment** - Level roles are automatically given when members reach the required level

## Configuration
The bot requires a `DISCORD_BOT_TOKEN` secret to connect to Discord.

## Required Bot Permissions
When inviting the bot to a server, ensure it has:
- Kick Members
- Ban Members
- Manage Roles
- Manage Channels
- Manage Messages
- Read Message History
- Send Messages

## Running the Bot
The bot runs using Node.js with the command: `node index.js`
