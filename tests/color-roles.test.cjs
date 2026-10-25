const test = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

const {
  COLOR_PALETTE,
  COLOR_ROLE_MARKER,
  COLOR_ROLE_PREFIXES,
  findPaletteColor,
  formatColorRoleName,
  isColorRole,
  parseHexColor
} = require('../dist/data/colors.js');

const {
  switchUserColorRole,
  removeUserColorRole,
  getUserColorRoles,
  findExistingColorRole,
  isColorSelectMenu,
  isColorButton,
  COLOR_SELECT_CUSTOM_ID,
  COLOR_REMOVE_CUSTOM_ID
} = require('../dist/services/color-roles.js');

test('COLOR_PALETTE contains valid and unique colors with hex and emoji', () => {
  assert.ok(COLOR_PALETTE.length >= 10, 'Palette has at least 10 colors');
  const ids = new Set();
  const names = new Set();

  for (const color of COLOR_PALETTE) {
    assert.ok(!ids.has(color.id), `Duplicate id ${color.id}`);
    assert.ok(!names.has(color.name), `Duplicate name ${color.name}`);
    ids.add(color.id);
    names.add(color.name);

    assert.match(color.hex, /^#[0-9A-F]{6}$/i, `Invalid hex ${color.hex}`);
    assert.ok(typeof color.colorNumber === 'number' && color.colorNumber > 0);
    assert.ok(typeof color.emoji === 'string' && color.emoji.length > 0);
  }
});

test('formatColorRoleName uses ✦ and strips legacy or repeated markers', () => {
  assert.equal(COLOR_ROLE_MARKER, '✦');
  assert.equal(formatColorRoleName('Crimson'), '✦ Crimson');
  assert.equal(formatColorRoleName('✦ Crimson'), '✦ Crimson');
  assert.equal(formatColorRoleName('✧ Emerald'), '✦ Emerald');
  assert.equal(formatColorRoleName('🎨 Sky Blue'), '✦ Sky Blue');
  assert.equal(formatColorRoleName('  ✦   Purple  '), '✦ Purple');
});

test('isColorRole identifies ✦ and ✧ roles, legacy prefixes, and palette names', () => {
  // Must detect ✦ roles
  assert.ok(isColorRole({ name: '✦ Crimson' }));
  assert.ok(isColorRole({ name: '✦ Emerald' }));

  // Must detect ✧ roles to replace
  assert.ok(isColorRole({ name: '✧ Crimson' }));
  assert.ok(isColorRole({ name: '✧ Sky Blue' }));

  // Must detect other color prefixes
  assert.ok(isColorRole({ name: '🎨 Blue' }));
  assert.ok(isColorRole({ name: 'color-red' }));
  assert.ok(isColorRole({ name: 'colour-blue' }));
  assert.ok(isColorRole({ name: 'color: green' }));

  // Must detect palette color names
  assert.ok(isColorRole({ name: 'Emerald' }));
  assert.ok(isColorRole({ name: 'crimson' }));
  assert.ok(isColorRole({ name: 'Sapphire' }));

  // Must NOT classify regular/admin roles as color roles
  assert.ok(!isColorRole({ name: 'Admin' }));
  assert.ok(!isColorRole({ name: 'Moderator' }));
  assert.ok(!isColorRole({ name: 'VIP' }));
  assert.ok(!isColorRole({ name: 'Member' }));
  assert.ok(!isColorRole({ name: '@everyone' }));
});

test('parseHexColor handles 6-digit and 3-digit hex codes and rejects junk', () => {
  const c1 = parseHexColor('#E74C3C');
  assert.ok(c1);
  assert.equal(c1.hex, '#E74C3C');
  assert.equal(c1.colorNumber, 0xE74C3C);

  const c2 = parseHexColor('3498db');
  assert.ok(c2);
  assert.equal(c2.hex, '#3498DB');
  assert.equal(c2.colorNumber, 0x3498DB);

  const c3 = parseHexColor('#abc');
  assert.ok(c3);
  assert.equal(c3.hex, '#AABBCC');
  assert.equal(c3.colorNumber, 0xAABBCC);

  assert.equal(parseHexColor('not-a-color'), null);
  assert.equal(parseHexColor('#12345'), null);
  assert.equal(parseHexColor('#1234567'), null);
});

test('findPaletteColor matches by id or name case-insensitively', () => {
  assert.equal(findPaletteColor('crimson')?.id, 'crimson');
  assert.equal(findPaletteColor('Sky Blue')?.id, 'sky_blue');
  assert.equal(findPaletteColor('sky_blue')?.id, 'sky_blue');
  assert.equal(findPaletteColor('EMERALD')?.id, 'emerald');
  assert.equal(findPaletteColor('nonexistent'), undefined);
});

test('component custom IDs matchers work correctly', () => {
  assert.ok(isColorSelectMenu(COLOR_SELECT_CUSTOM_ID));
  assert.ok(!isColorSelectMenu('other_select'));
  assert.ok(isColorButton(COLOR_REMOVE_CUSTOM_ID));
  assert.ok(!isColorButton('other_button'));
});

// Helper for building mock Discord objects
function createMockGuild() {
  const roles = new Collection();

  function makeRole(id, name, color, position = 1) {
    const role = {
      id,
      name,
      color,
      position,
      managed: false,
      setPosition: async (pos) => { role.position = pos; return role; }
    };
    roles.set(id, role);
    return role;
  }

  // Pre-populate some roles
  const botRole = makeRole('bot-role-id', 'Bot', 0, 100);
  const adminRole = makeRole('admin-role-id', 'Admin', 0, 90);

  const guild = {
    id: 'guild-1',
    name: 'Test Guild',
    ownerId: 'owner-user-id',
    client: { user: { id: 'bot-user-id' } },
    roles: {
      cache: roles,
      create: async ({ name, color }) => {
        const id = `role-${Date.now()}-${Math.random()}`;
        return makeRole(id, name, color, 50);
      }
    },
    members: {
      cache: new Collection(),
      me: {
        id: 'bot-user-id',
        permissions: { has: () => true },
        roles: { highest: botRole }
      },
      fetch: async (id) => {
        if (id === 'bot-user-id') return guild.members.me;
        return guild.members.cache.get(id);
      }
    }
  };

  return { guild, makeRole };
}

function createMockMember(guild, id, tag, initialRoles = []) {
  const memberRoles = new Collection();
  for (const r of initialRoles) {
    memberRoles.set(r.id, r);
  }

  let highestRole = initialRoles[0] || { position: 10 };

  const member = {
    id,
    user: { id, tag },
    roles: {
      cache: memberRoles,
      highest: highestRole,
      add: async (role) => {
        memberRoles.set(role.id, role);
      },
      remove: async (roles) => {
        if (roles instanceof Collection || roles instanceof Map) {
          for (const role of roles.values()) {
            memberRoles.delete(role.id);
          }
        } else if (Array.isArray(roles)) {
          for (const role of roles) {
            memberRoles.delete(typeof role === 'string' ? role : role.id);
          }
        } else {
          memberRoles.delete(typeof roles === 'string' ? roles : roles.id);
        }
      }
    },
    permissions: { has: () => true }
  };

  guild.members.cache.set(id, member);
  return member;
}

test('switchUserColorRole assigns new ✦ role and replaces existing ✦ and ✧ roles', async () => {
  const { guild, makeRole } = createMockGuild();

  // Member currently has an old ✧ role and an admin role
  const legacyRole = makeRole('legacy-1', '✧ Emerald', 0x2ECC71, 10);
  const oldStarRole = makeRole('old-star-1', '✦ Blue', 0x206694, 11);
  const adminRole = guild.roles.cache.get('admin-role-id');

  const member = createMockMember(guild, 'user-1', 'User#0001', [legacyRole, oldStarRole, adminRole]);

  assert.equal(getUserColorRoles(member).length, 2);

  // Switch to Crimson
  const result = await switchUserColorRole(guild, member, {
    name: 'Crimson',
    colorNumber: 0xE74C3C,
    hex: '#E74C3C'
  });

  assert.ok(result.success);
  assert.equal(result.role.name, '✦ Crimson');
  assert.equal(result.role.color, 0xE74C3C);

  // Both legacy ✧ and previous ✦ roles were removed
  assert.equal(result.removedRoles.length, 2);
  const removedIds = result.removedRoles.map(r => r.id);
  assert.ok(removedIds.includes('legacy-1'));
  assert.ok(removedIds.includes('old-star-1'));

  // Admin role was preserved!
  assert.ok(member.roles.cache.has(adminRole.id));
  // Member now has the new ✦ Crimson role
  assert.ok(member.roles.cache.has(result.role.id));
});

test('switchUserColorRole detects when user already has the requested role', async () => {
  const { guild, makeRole } = createMockGuild();
  const crimsonRole = makeRole('crimson-id', '✦ Crimson', 0xE74C3C, 20);
  const member = createMockMember(guild, 'user-2', 'User#0002', [crimsonRole]);

  const result = await switchUserColorRole(guild, member, {
    name: 'Crimson',
    colorNumber: 0xE74C3C,
    hex: '#E74C3C'
  });

  assert.ok(result.success);
  assert.equal(result.alreadyHad, true);
  assert.equal(result.role.id, crimsonRole.id);
});

test('removeUserColorRole strips all ✦ and ✧ roles from member', async () => {
  const { guild, makeRole } = createMockGuild();
  const legacyRole = makeRole('legacy-role', '✧ Rose', 0xE91E63, 10);
  const starRole = makeRole('star-role', '✦ Purple', 0x9B59B6, 12);
  const member = createMockMember(guild, 'user-3', 'User#0003', [legacyRole, starRole]);

  const result = await removeUserColorRole(guild, member);
  assert.ok(result.success);
  assert.equal(result.removedRoles.length, 2);
  assert.equal(member.roles.cache.size, 0);

  // Calling remove again when no color roles exist
  const resultEmpty = await removeUserColorRole(guild, member);
  assert.ok(resultEmpty.success);
  assert.equal(resultEmpty.removedRoles.length, 0);
});

test('switchUserColorRole rejects non-moderator trying to change another user', async () => {
  const { guild, makeRole } = createMockGuild();
  const member1 = createMockMember(guild, 'user-1', 'User#0001', []);
  const member2 = createMockMember(guild, 'user-2', 'User#0002', []);

  // caller lacks ManageRoles
  member1.permissions = { has: () => false };

  const result = await switchUserColorRole(
    guild,
    member2,
    { name: 'Gold', colorNumber: 0xF1C40F, hex: '#F1C40F' },
    member1
  );

  assert.equal(result.success, false);
  assert.match(result.error, /Manage Roles/);
});

test('switchUserColorRole rejects assignment if bot role is below target role', async () => {
  const { guild, makeRole } = createMockGuild();
  const member = createMockMember(guild, 'user-1', 'User#0001', []);

  // Bot role position is 10, but target role position is 50
  guild.members.me.roles.highest = { position: 10 };
  const highRole = makeRole('high-role-id', '✦ HighRole', 0x123456, 50);

  const result = await switchUserColorRole(
    guild,
    member,
    { name: 'HighRole', role: highRole }
  );

  assert.equal(result.success, false);
  assert.match(result.error, /higher than or equal to my highest role/);
});
