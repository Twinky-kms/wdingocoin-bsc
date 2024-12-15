"use strict";

const childProcess = require('child_process');
const sqlite3 = require('sqlite3')
const util = require('util');
const mysqlLogger = require('./database/mysql_logger');

let db = null;
let dbLock = null;

module.exports = {
  dump,
  reset,
  load,

  hasUsedDepositAddresses,
  registerUsedDepositAddresses,

  registerMintDepositAddress,
  getMintDepositAddress,
  getMintDepositAddresses,
  updateMintDepositAddresses,

  registerWithdrawal,
  getWithdrawal,
  getWithdrawals,
  getUnapprovedWithdrawals,
  updateWithdrawals
};

async function dump(path) {
  return (await util.promisify(childProcess.exec)(`sqlite3 ${path} ".dump"`)).stdout;
}

async function reset(path, sql) {
  try {
    childProcess.execSync(`rm ${path}`, { stdio : 'ignore' });
  } catch (err) {
  }
  const child = childProcess.spawn(`sqlite3`);
  child.stdin.setEncoding('utf-8');
  child.stdin.write(`.open ${path}\n`);
  child.stdin.write(sql);
  child.stdin.write('\n');
  child.stdin.end();
}

async function load(path) {
  db = new sqlite3.Database(path);
  // Initialize MySQL connection
  await mysqlLogger.connect();
}

async function hasUsedDepositAddresses(depositAddresses) {
  return (await util.promisify(db.get.bind(db))(
    `SELECT COUNT(*) from usedDepositAddresses WHERE address IN (${depositAddresses.map(x => '?')})`,
    depositAddresses
  ))['COUNT(*)'] > 0;
}

async function registerUsedDepositAddresses(depositAddresses) {
  const statement = db.prepare('INSERT INTO usedDepositAddresses (address) VALUES (?)');
  for (const depositAddress of depositAddresses) {
    await util.promisify(statement.run.bind(statement))([depositAddress]);
    // Log to MySQL
    await mysqlLogger.logUsedDepositAddress(depositAddress);
  }
  statement.finalize();
}

async function registerMintDepositAddress(mintAddress, depositAddress, redeemScript) {
  await util.promisify(db.run.bind(db))(
    'INSERT INTO mintDepositAddresses (mintAddress, depositAddress, redeemScript) VALUES (?, ?, ?)',
    [mintAddress, depositAddress, redeemScript]
  );
  // Log to MySQL
  await mysqlLogger.logMintDepositAddress(mintAddress, depositAddress, redeemScript);
}

async function getMintDepositAddress(mintAddress) {
  const results = await util.promisify(db.all.bind(db)) (
    'SELECT depositAddress FROM mintDepositAddresses WHERE mintAddress=?',
    [mintAddress]
  );
  if (results.length === 0) {
    return null;
  }
  if (results.length !== 1) {
    throw new Error('Whoever wrote the SQL code is a noob');
  }
  return results[0].depositAddress;
}

async function getMintDepositAddresses(filterDepositAddresses) {
  if (filterDepositAddresses !== null && filterDepositAddresses !== undefined) {
    return await util.promisify(db.all.bind(db))(
      `SELECT mintAddress, depositAddress, approvedTax FROM mintDepositAddresses WHERE depositAddress IN (${filterDepositAddresses.map(x => '?')})`,
      filterDepositAddresses
    );
  } else {
    return await util.promisify(db.all.bind(db))(`SELECT mintAddress, depositAddress, approvedTax FROM mintDepositAddresses`);
  }
}

// TODO: Maybe warn that only the approvedTax field will be updated.
async function updateMintDepositAddresses(mintDepositAddresses) {
  const stmt = db.prepare(`UPDATE mintDepositAddresses SET approvedTax=? WHERE depositAddress=?`);
  for (const a of mintDepositAddresses) {
    await stmt.run(a.approvedTax, a.depositAddress);
    // Log to MySQL
    await mysqlLogger.updateMintDepositAddress(a.depositAddress, a.approvedTax);
  }
  stmt.finalize();
}

async function registerWithdrawal(burnAddress, burnIndex) {
  await util.promisify(db.run.bind(db))(
    'INSERT INTO withdrawals (burnAddress, burnIndex) VALUES (?, ?)',
    [burnAddress, burnIndex]
  );
  // Log to MySQL
  await mysqlLogger.logWithdrawal(burnAddress, burnIndex);
}

async function getWithdrawal(burnAddress, burnIndex) {
  const result = await util.promisify(db.all.bind(db))(
    `SELECT burnAddress, burnIndex, approvedAmount, approvedTax from withdrawals WHERE burnAddress=? AND burnIndex=?`,
    [burnAddress, burnIndex]
  );
  if (result.length === 0) {
    return null;
  }
  if (result.length !== 1) {
    throw new Error('Withdrawal duplicated on (burnAddress, burnIndex)');
  }
  return result[0];
}

async function getWithdrawals() {
  return await util.promisify(db.all.bind(db))(
    `SELECT burnAddress, burnIndex, approvedAmount, approvedTax FROM withdrawals`
  );
}

async function getUnapprovedWithdrawals() {
  return await util.promisify(db.all.bind(db))(
    `SELECT burnAddress, burnIndex, approvedAmount, approvedTax FROM withdrawals WHERE approvedTax="0"`
  );
}

async function updateWithdrawals(withdrawals) {
  const stmt = db.prepare(`UPDATE withdrawals SET approvedAmount=?, approvedTax=? WHERE burnAddress=? AND burnIndex=?`);
  for (const w of withdrawals) {
    await stmt.run(w.approvedAmount, w.approvedTax, w.burnAddress, w.burnIndex);
    // Log to MySQL
    await mysqlLogger.updateWithdrawal(w.burnAddress, w.burnIndex, w.approvedAmount, w.approvedTax);
  }
  stmt.finalize();
}
