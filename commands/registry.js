'use strict';

/**
 * Shared command registry. Kept separate so command modules can query the
 * full command list without creating a circular import problem.
 */

const registry = new Map();

function register(def) {
  if (!def || !def.command) return;
  const name = def.command.toLowerCase();
  registry.set(name, def);
}

function getCommand(name) {
  return registry.get(String(name || '').toLowerCase());
}

function getAllCommands() {
  return [...registry.values()];
}

function count() {
  return registry.size;
}

module.exports = { register, getCommand, getAllCommands, count, registry };
