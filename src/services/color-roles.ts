// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// File: src/services/color-roles.ts

import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  Role,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction
} from 'discord.js';
import { ExtendedClient } from '../types/client';
import {
  COLOR_PALETTE,
  findPaletteColor,
  formatColorRoleName,
  isColorRole,
  parseHexColor
} from '../data/colors';
import { logger } from '../utils/logger';

export const COLOR_SELECT_CUSTOM_ID = 'color_role_select';
export const COLOR_SELECT_WARM_ID = 'color_role_select_warm';
export const COLOR_SELECT_COOL_ID = 'color_role_select_cool';
export const COLOR_REMOVE_CUSTOM_ID = 'color_role_remove';

export function isColorSelectMenu(customId: string): boolean {
  return (
    customId === COLOR_SELECT_CUSTOM_ID ||
    customId.startsWith('color_role_select')
  );
}

export function isColorButton(customId: string): boolean {
  return customId === COLOR_REMOVE_CUSTOM_ID;
}

export interface SwitchColorTarget {
  name: string;
  hex?: string;
  colorNumber?: number;
  role?: Role;
}

export interface SwitchColorResult {
  success: boolean;
  role?: Role;
  alreadyHad?: boolean;
  removedRoles?: Role[];
  error?: string;
}

export interface RemoveColorResult {
  success: boolean;
  removedRoles?: Role[];
  error?: string;
}

/**
 * Returns any color role currently assigned to the member.
 */
export function getUserColorRoles(member: GuildMember): Role[] {
  return [...member.roles.cache.filter(role => isColorRole(role)).values()];
}

/**
 * Finds an existing role in the guild matching the color target, or returns undefined.
 */
export function findExistingColorRole(guild: Guild, target: SwitchColorTarget): Role | undefined {
  if (target.role) return target.role;

  const formattedName = formatColorRoleName(target.name).toLowerCase();
  const cleanName = target.name
    .replace(/^(color|colour)[-:\s]+/iu, '')
    .replace(/^[✦✧🎨\s:]+/u, '')
    .trim()
    .toLowerCase();

  // 1. Check exact formatted name (✦ Name)
  const exactRole = guild.roles.cache.find(r => r.name.toLowerCase() === formattedName);
  if (exactRole) return exactRole;

  // 2. Check legacy or raw prefixes (✧ Name, 🎨 Name, Name)
  const legacyRole = guild.roles.cache.find(r => {
    const rName = r.name.toLowerCase();
    return (
      rName === cleanName ||
      rName === `✦ ${cleanName}` ||
      rName === `✧ ${cleanName}` ||
      rName === `🎨 ${cleanName}` ||
      rName === `color-${cleanName}` ||
      rName === `colour-${cleanName}`
    );
  });
  if (legacyRole) return legacyRole;

  // 3. Match by color value if target has a specific color number
  if (target.colorNumber !== undefined && target.colorNumber !== 0) {
    const colorMatchedRole = guild.roles.cache.find(
      r => r.color === target.colorNumber && isColorRole(r)
    );
    if (colorMatchedRole) return colorMatchedRole;
  }

  return undefined;
}

/**
 * Switches a user's color role. Replaces any existing color role(s) (including ✦ and ✧ roles).
 */
export async function switchUserColorRole(
  guild: Guild,
  member: GuildMember,
  target: SwitchColorTarget,
  requestedBy?: GuildMember
): Promise<SwitchColorResult> {
  const botMember = guild.members.me ?? (await guild.members.fetch(guild.client.user.id).catch(() => null));
  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return {
      success: false,
      error: 'I need the **Manage Roles** permission to create or assign color roles.'
    };
  }

  // Permission check if changing someone else's role
  if (requestedBy && requestedBy.id !== member.id) {
    if (!requestedBy.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return {
        success: false,
        error: 'You need the **Manage Roles** permission to change another member’s color role.'
      };
    }
    if (
      requestedBy.id !== guild.ownerId &&
      member.roles.highest.position >= requestedBy.roles.highest.position
    ) {
      return {
        success: false,
        error: 'You cannot change the color role of a member with an equal or higher role than yours.'
      };
    }
  }

  // Determine or create the target role
  let targetRole: Role;
  if (target.role) {
    targetRole = target.role;
    if (targetRole.managed) {
      return { success: false, error: 'That role is managed by an integration and cannot be assigned.' };
    }
    if (targetRole.id === guild.id) {
      return { success: false, error: 'The @everyone role cannot be used as a color role.' };
    }
    if (botMember.roles.highest.position <= targetRole.position) {
      return {
        success: false,
        error: `I cannot assign **${targetRole.name}** because it is positioned higher than or equal to my highest role.`
      };
    }
  } else {
    const existing = findExistingColorRole(guild, target);
    if (existing) {
      targetRole = existing;
      if (botMember.roles.highest.position <= targetRole.position) {
        return {
          success: false,
          error: `I cannot assign **${targetRole.name}** because it is positioned higher than or equal to my highest role.`
        };
      }
    } else {
      if (guild.roles.cache.size >= 250) {
        return {
          success: false,
          error: 'Cannot create role: this server has reached Discord’s 250 role limit.'
        };
      }
      // Always use ✦ for creating new color roles
      const newRoleName = formatColorRoleName(target.name);
      try {
        targetRole = await guild.roles.create({
          name: newRoleName,
          color: target.colorNumber ?? 0,
          permissions: [],
          mentionable: false,
          reason: `Color role for ${member.user.tag}`
        });

        // Position just below the bot's highest role so color displays prominently
        try {
          const targetPos = Math.max(1, botMember.roles.highest.position - 1);
          await targetRole.setPosition(targetPos);
        } catch (posError) {
          logger.warn(`Could not adjust position for new color role ${targetRole.name}:`, posError);
        }
      } catch (createError) {
        logger.error(`Failed to create color role ${newRoleName}:`, createError);
        return { success: false, error: 'Failed to create the color role in Discord.' };
      }
    }
  }

  // Find all existing color roles attached to the user (e.g. ✦, ✧, 🎨, etc.)
  const existingColorRoles = member.roles.cache.filter(r => isColorRole(r));
  const rolesToRemove = existingColorRoles.filter(r => r.id !== targetRole.id);

  // Check if bot can remove all existing color roles
  for (const r of rolesToRemove.values()) {
    if (botMember.roles.highest.position <= r.position) {
      return {
        success: false,
        error: `I cannot remove your existing color role **${r.name}** because it is positioned higher than or equal to my highest role.`
      };
    }
  }

  // Remove existing color roles
  if (rolesToRemove.size > 0) {
    try {
      await member.roles.remove(rolesToRemove, 'Replacing previous color role(s)');
    } catch (removeError) {
      logger.error(`Failed to remove old color roles for ${member.user.tag}:`, removeError);
      return { success: false, error: 'Failed to remove old color role(s).' };
    }
  }

  // Assign target role if not already present
  const alreadyHad = member.roles.cache.has(targetRole.id);
  if (!alreadyHad) {
    try {
      await member.roles.add(targetRole, 'Switched color role');
    } catch (addError) {
      logger.error(`Failed to assign color role ${targetRole.name} to ${member.user.tag}:`, addError);
      return { success: false, error: 'Failed to assign the new color role.' };
    }
  }

  return {
    success: true,
    role: targetRole,
    alreadyHad: alreadyHad && rolesToRemove.size === 0,
    removedRoles: [...rolesToRemove.values()]
  };
}

/**
 * Removes all attached color roles from the member.
 */
export async function removeUserColorRole(
  guild: Guild,
  member: GuildMember,
  requestedBy?: GuildMember
): Promise<RemoveColorResult> {
  const botMember = guild.members.me ?? (await guild.members.fetch(guild.client.user.id).catch(() => null));
  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return {
      success: false,
      error: 'I need the **Manage Roles** permission to remove color roles.'
    };
  }

  if (requestedBy && requestedBy.id !== member.id) {
    if (!requestedBy.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return {
        success: false,
        error: 'You need the **Manage Roles** permission to remove another member’s color role.'
      };
    }
    if (
      requestedBy.id !== guild.ownerId &&
      member.roles.highest.position >= requestedBy.roles.highest.position
    ) {
      return {
        success: false,
        error: 'You cannot modify the roles of a member with an equal or higher role than yours.'
      };
    }
  }

  const existingColorRoles = member.roles.cache.filter(r => isColorRole(r));
  if (existingColorRoles.size === 0) {
    return { success: true, removedRoles: [] };
  }

  for (const r of existingColorRoles.values()) {
    if (botMember.roles.highest.position <= r.position) {
      return {
        success: false,
        error: `I cannot remove the color role **${r.name}** because it is positioned higher than or equal to my highest role.`
      };
    }
  }

  try {
    await member.roles.remove(existingColorRoles, 'Removed color role');
    return { success: true, removedRoles: [...existingColorRoles.values()] };
  } catch (err) {
    logger.error(`Failed to remove color roles for ${member.user.tag}:`, err);
    return { success: false, error: 'Failed to remove color role(s) in Discord.' };
  }
}

/**
 * Builds the interactive embed displaying the palette and user's current color role.
 */
export function createColorPickerEmbed(
  guild: Guild,
  member: GuildMember,
  spelling: 'color' | 'colour' = 'color'
): EmbedBuilder {
  const currentRoles = getUserColorRoles(member);
  const currentText = currentRoles.length > 0
    ? currentRoles.map(r => `<@&${r.id}>`).join(', ')
    : 'None';

  const titleWord = spelling === 'colour' ? 'Colour' : 'Color';

  const warmHues = COLOR_PALETTE.filter(c => c.category === 'warm').map(
    c => `${c.emoji} **${c.name}** \`${c.hex}\``
  );
  const coolHues = COLOR_PALETTE.filter(c => c.category === 'cool').map(
    c => `${c.emoji} **${c.name}** \`${c.hex}\``
  );

  return new EmbedBuilder()
    .setTitle(`✦ Server ${titleWord} Roles`)
    .setDescription(
      `Pick a ${spelling} from the dropdown menus below to customize your name ${spelling} in **${guild.name}**.\n` +
      `Active ${spelling} roles prefixed with **✦** (or legacy **✧**) will be replaced automatically.`
    )
    .setColor(currentRoles[0]?.color || 0x15999f)
    .addFields(
      {
        name: `Your Active ${titleWord} Role`,
        value: currentText,
        inline: false
      },
      {
        name: `🔥 Warm & Vibrant Hues (${warmHues.length})`,
        value: warmHues.join('\n'),
        inline: true
      },
      {
        name: `❄️ Cool & Earthy Hues (${coolHues.length})`,
        value: coolHues.join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `Total: ${COLOR_PALETTE.length} presets · Use /${spelling} switch [${spelling}] anytime.` });
}

/**
 * Builds the component rows (select menus + remove button) for the interactive picker.
 */
export function createColorPickerComponents(
  spelling: 'color' | 'colour' = 'color'
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const titleWord = spelling === 'colour' ? 'Colour' : 'Color';

  const warmColors = COLOR_PALETTE.filter(c => c.category === 'warm');
  const coolColors = COLOR_PALETTE.filter(c => c.category === 'cool');

  const warmOptions = warmColors.map(c => ({
    label: c.name,
    value: c.id,
    description: `Hex: ${c.hex}`,
    emoji: c.emoji
  }));
  warmOptions.push({
    label: `Remove ${titleWord}`,
    value: 'remove',
    description: `Clear your active ${spelling} role`,
    emoji: '❌'
  });

  const coolOptions = coolColors.map(c => ({
    label: c.name,
    value: c.id,
    description: `Hex: ${c.hex}`,
    emoji: c.emoji
  }));
  coolOptions.push({
    label: `Remove ${titleWord}`,
    value: 'remove',
    description: `Clear your active ${spelling} role`,
    emoji: '❌'
  });

  const warmMenu = new StringSelectMenuBuilder()
    .setCustomId(COLOR_SELECT_WARM_ID)
    .setPlaceholder(`✦ Warm & Vibrant Hues (${warmColors.length})...`)
    .addOptions(warmOptions);

  const coolMenu = new StringSelectMenuBuilder()
    .setCustomId(COLOR_SELECT_COOL_ID)
    .setPlaceholder(`✦ Cool & Earthy Hues (${coolColors.length})...`)
    .addOptions(coolOptions);

  const removeButton = new ButtonBuilder()
    .setCustomId(COLOR_REMOVE_CUSTOM_ID)
    .setLabel(`Remove ${titleWord}`)
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(warmMenu);
  const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(coolMenu);
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(removeButton);

  return [row1, row2, row3];
}

/**
 * Handles select menu interaction from the color picker.
 */
export async function handleColorSelectMenu(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Color roles can only be used inside a server.', ephemeral: true });
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const member =
      interaction.member instanceof GuildMember
        ? interaction.member
        : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
      await interaction.editReply({ content: 'Could not fetch your server member data.' });
      return;
    }

    const selectedValue = interaction.values[0];

    if (selectedValue === 'remove') {
      const result = await removeUserColorRole(interaction.guild, member);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
        return;
      }
      if (!result.removedRoles || result.removedRoles.length === 0) {
        await interaction.editReply({ content: 'You do not currently have an active color role.' });
        return;
      }
      const removedNames = result.removedRoles.map(r => `**${r.name}**`).join(', ');
      await interaction.editReply({ content: `✅ Removed your color role (${removedNames}).` });
      return;
    }

    const paletteColor = findPaletteColor(selectedValue);
    if (!paletteColor) {
      await interaction.editReply({ content: '❌ Selected color is invalid or unknown.' });
      return;
    }

    const result = await switchUserColorRole(interaction.guild, member, {
      name: paletteColor.name,
      hex: paletteColor.hex,
      colorNumber: paletteColor.colorNumber
    });

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(result.role?.color || paletteColor.colorNumber)
      .setTitle('✦ Color Role Updated')
      .setTimestamp();

    if (result.alreadyHad) {
      embed.setDescription(`You already have the **${result.role?.name}** color role!`);
    } else {
      let desc = `Switched your color role to **${result.role?.name}**!`;
      if (result.removedRoles && result.removedRoles.length > 0) {
        const removedText = result.removedRoles.map(r => `**${r.name}**`).join(', ');
        desc += `\nReplaced previous role: ${removedText}`;
      }
      embed.setDescription(desc);
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Error handling color select menu:', err);
    const msg = 'An unexpected error occurred while updating your color role.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ ${msg}` }).catch(() => null);
    } else {
      await interaction.reply({ content: `❌ ${msg}`, ephemeral: true }).catch(() => null);
    }
  }
}

/**
 * Handles button interaction from the color picker ("Remove Color").
 */
export async function handleColorButton(interaction: ButtonInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Color roles can only be used inside a server.', ephemeral: true });
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const member =
      interaction.member instanceof GuildMember
        ? interaction.member
        : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
      await interaction.editReply({ content: 'Could not fetch your server member data.' });
      return;
    }

    const result = await removeUserColorRole(interaction.guild, member);
    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    if (!result.removedRoles || result.removedRoles.length === 0) {
      await interaction.editReply({ content: 'You do not currently have an active color role.' });
      return;
    }

    const removedNames = result.removedRoles.map(r => `**${r.name}**`).join(', ');
    await interaction.editReply({ content: `✅ Removed your color role (${removedNames}).` });
  } catch (err) {
    logger.error('Error handling color button:', err);
    const msg = 'An unexpected error occurred while removing your color role.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ ${msg}` }).catch(() => null);
    } else {
      await interaction.reply({ content: `❌ ${msg}`, ephemeral: true }).catch(() => null);
    }
  }
}

/**
 * Autocomplete handler for /color switch and /colour switch.
 */
export async function handleColorAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focused = interaction.options.getFocused().trim().toLowerCase();
    const results: { name: string; value: string }[] = [];

    // If user is typing a hex code, suggest it as a custom hex option
    if (focused.startsWith('#') || /^[0-9a-f]{3,6}$/i.test(focused)) {
      const parsed = parseHexColor(focused);
      if (parsed) {
        results.push({
          name: `✦ Custom Hex: ${parsed.hex}`,
          value: parsed.hex
        });
      }
    }

    // Filter matching colors from palette
    const matching = COLOR_PALETTE.filter(
      c =>
        c.name.toLowerCase().includes(focused) ||
        c.id.toLowerCase().includes(focused) ||
        c.hex.toLowerCase().includes(focused)
    );

    for (const c of matching) {
      if (results.length >= 25) break;
      results.push({
        name: `${c.emoji} ${c.name} (${c.hex})`,
        value: c.id
      });
    }

    // If no match was found, show top preset colors
    if (results.length === 0) {
      for (const c of COLOR_PALETTE.slice(0, 25)) {
        results.push({
          name: `${c.emoji} ${c.name} (${c.hex})`,
          value: c.id
        });
      }
    }

    await interaction.respond(results.slice(0, 25));
  } catch (err) {
    logger.debug('Could not send color autocomplete response:', err);
  }
}

/**
 * Core command executor shared by both /color and /colour slash commands.
 */
export async function executeColorCommand(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  spelling: 'color' | 'colour' = 'color'
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: `${spelling === 'colour' ? 'Colour' : 'Color'} roles can only be used inside a server.`,
      ephemeral: true
    });
    return;
  }

  const callerMember =
    interaction.member instanceof GuildMember
      ? interaction.member
      : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!callerMember) {
    await interaction.reply({ content: 'Could not fetch your server member record.', ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const titleWord = spelling === 'colour' ? 'Colour' : 'Color';

  // 1. /color list
  if (subcommand === 'list') {
    const isPublic = interaction.options.getBoolean('public') ?? false;
    const embed = createColorPickerEmbed(interaction.guild, callerMember, spelling);
    const components = createColorPickerComponents(spelling);

    await interaction.reply({
      embeds: [embed],
      components,
      ephemeral: !isPublic
    });
    return;
  }

  // 2. /color remove
  if (subcommand === 'remove') {
    const targetUser = interaction.options.getUser('user');
    const targetMember = targetUser
      ? await interaction.guild.members.fetch(targetUser.id).catch(() => null)
      : callerMember;

    if (!targetMember) {
      await interaction.reply({ content: 'Could not find that member in this server.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await removeUserColorRole(interaction.guild, targetMember, callerMember);
    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    if (!result.removedRoles || result.removedRoles.length === 0) {
      const targetLabel = targetMember.id === callerMember.id ? 'You do' : `<@${targetMember.id}> does`;
      await interaction.editReply({ content: `${targetLabel} not currently have an active ${spelling} role.` });
      return;
    }

    const removedNames = result.removedRoles.map(r => `**${r.name}**`).join(', ');
    const replyText =
      targetMember.id === callerMember.id
        ? `✅ Removed your ${spelling} role (${removedNames}).`
        : `✅ Removed ${spelling} role (${removedNames}) from <@${targetMember.id}>.`;

    await interaction.editReply({ content: replyText });
    return;
  }

  // 3. /color switch
  if (subcommand === 'switch') {
    const targetUser = interaction.options.getUser('user');
    const targetMember = targetUser
      ? await interaction.guild.members.fetch(targetUser.id).catch(() => null)
      : callerMember;

    if (!targetMember) {
      await interaction.reply({ content: 'Could not find that member in this server.', ephemeral: true });
      return;
    }

    const colorInput =
      interaction.options.getString(spelling) ??
      interaction.options.getString('color') ??
      interaction.options.getString('colour');
    const roleInput = interaction.options.getRole('role') as Role | null;

    // If neither color nor role was supplied, show interactive switcher
    if (!colorInput && !roleInput) {
      const embed = createColorPickerEmbed(interaction.guild, targetMember, spelling);
      const components = createColorPickerComponents(spelling);
      await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let target: SwitchColorTarget;

    if (roleInput) {
      target = { name: roleInput.name, role: roleInput, colorNumber: roleInput.color };
    } else if (colorInput) {
      const paletteMatch = findPaletteColor(colorInput);
      if (paletteMatch) {
        target = {
          name: paletteMatch.name,
          hex: paletteMatch.hex,
          colorNumber: paletteMatch.colorNumber
        };
      } else {
        const hexMatch = parseHexColor(colorInput);
        if (hexMatch) {
          target = {
            name: hexMatch.hex,
            hex: hexMatch.hex,
            colorNumber: hexMatch.colorNumber
          };
        } else {
          // Check if an existing role in the guild matches the input string
          const cleanInput = colorInput.trim().toLowerCase();
          const existingRole = interaction.guild.roles.cache.find(
            r =>
              r.name.toLowerCase() === cleanInput ||
              r.name.toLowerCase() === `✦ ${cleanInput}` ||
              r.name.toLowerCase() === `✧ ${cleanInput}` ||
              r.name.toLowerCase() === `color-${cleanInput}` ||
              r.name.toLowerCase() === `colour-${cleanInput}`
          );
          if (existingRole) {
            target = { name: existingRole.name, role: existingRole, colorNumber: existingRole.color };
          } else {
            await interaction.editReply({
              content:
                `❌ Unknown ${spelling} "**${colorInput}**".\n` +
                `Please pick from the preset choices, enter a 6-character hex code (e.g. \`#3498DB\`), or specify an existing role.`
            });
            return;
          }
        }
      }
    } else {
      await interaction.editReply({ content: `Please provide a ${spelling} or a role to switch to.` });
      return;
    }

    const result = await switchUserColorRole(interaction.guild, targetMember, target, callerMember);
    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(result.role?.color || target.colorNumber || 0x15999f)
      .setTitle(`✦ ${titleWord} Role Updated`)
      .setTimestamp();

    const isSelf = targetMember.id === callerMember.id;
    const targetLabel = isSelf ? 'your' : `<@${targetMember.id}>'s`;

    if (result.alreadyHad) {
      embed.setDescription(
        isSelf
          ? `You already have the **${result.role?.name}** ${spelling} role!`
          : `<@${targetMember.id}> already has the **${result.role?.name}** ${spelling} role!`
      );
    } else {
      let desc = `Switched ${targetLabel} ${spelling} role to **${result.role?.name}**!`;
      if (result.removedRoles && result.removedRoles.length > 0) {
        const removedNames = result.removedRoles.map(r => `**${r.name}**`).join(', ');
        desc += `\nReplaced previous role(s): ${removedNames}`;
      }
      embed.setDescription(desc);
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
