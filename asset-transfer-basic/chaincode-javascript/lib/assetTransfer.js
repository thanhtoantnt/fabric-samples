/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

  async InitLedger(ctx) {
      const assets = [
        {
          ID: 'A0',
          IsNormal: true,
          Balance: 100,
        },
        {
          ID: 'A1',
          IsNormal: true,
          Balance: 100,
        },
        {
          ID: 'A2',
          IsNormal: true,
          Balance: 100,
        },
        {
          ID: 'A3',
          IsNormal: true,
          Balance: 100,
        },
        {
          ID: 'A4',
          IsNormal: true,
          Balance: 100,
        }
      ];

    for (const asset of assets) {
      asset.docType = 'asset';
      await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
    }
  }

  async CreateAccount(ctx, id, type, newValue) {
    const exists = await this.AccountExists(ctx, id);
    if (exists) {
      throw new Error(`The asset ${id} already exists`);
    }

    const asset = {
      ID: id,
      IsNormal: type,
      Balance: newValue,
    };
    await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    return JSON.stringify(asset);
  }

  async ReadAsset(ctx, id) {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }

  async getBalance(ctx, id) {
    const assetString = await this.ReadAsset(ctx, id);
    // const asset = JSON.parse(assetString);
    // const balance = asset.Balance;
    return assetString;
  }

  async UpdateAccount(ctx, id, type, newValue) {
    const exists = await this.AccountExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    const updatedAsset = {
      ID: id,
      IsNormal: type,
      Balance: newValue,
    };
    return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
  }

  async DeleteAccount(ctx, id) {
    const exists = await this.AccountExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return ctx.stub.deleteState(id);
  }

  async AccountExists(ctx, id) {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  async sendAmount(ctx, account1ID, account2ID, amount) {
    const assetString1 = await this.ReadAsset(ctx, account1ID);
    const asset1 = JSON.parse(assetString1);

    const assetString2 = await this.ReadAsset(ctx, account2ID);
    const asset2 = JSON.parse(assetString2);

    const amount_num = JSON.parse(amount);

    if (amount_num > asset1.Balance){
      throw new Error(`The amount is over the balance of the sender`);
    }

    asset1.Balance = asset1.Balance - amount_num;
    asset2.Balance = asset2.Balance + amount_num;

    await ctx.stub.putState(account1ID, Buffer.from(stringify(sortKeysRecursive(asset1))));
    await ctx.stub.putState(account2ID, Buffer.from(stringify(sortKeysRecursive(asset2))));
    return asset1;
  }

  async GetAllAssets(ctx) {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }
}

module.exports = AssetTransfer;
