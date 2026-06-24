import { expect } from 'chai';
import { ensureDefaultGroups } from '../../libs/adminpanel/ensureDefaultGroups';

describe('ensureDefaultGroups', function () {
  it('creates only groups that do not exist', async function () {
    const checkedGroupNames: string[] = [];
    const records: any[] = [
      {
        name: 'Operator',
        description: 'Changed by an administrator',
        tokens: ['custom-token'],
        users: [10],
      },
    ];
    const groupModel = {
      _findOne: async ({ name }: any) => {
        checkedGroupNames.push(name);
        return records.find((record) => record.name === name);
      },
      _create: async (record: any) => {
        records.push(record);
        return record;
      },
      _updateOne: async ({ name }: any, updates: any) => {
        const record = records.find((item) => item.name === name);
        Object.assign(record, updates);
        return record;
      },
    };
    const adminizer = {
      modelHandler: {
        model: { get: () => groupModel },
      },
    };

    await ensureDefaultGroups(adminizer, [
      {
        name: 'Operator',
        description: 'Processes and updates current orders',
        tokens: ['order-kanban'],
        ensureTokens: ['sales-channels-manager'],
      },
      {
        name: 'Marketer',
        description: 'Manages promotions',
        tokens: ['read-promotion-model'],
      },
    ]);

    expect(records).to.have.length(2);
    expect(checkedGroupNames).to.deep.equal(['Operator', 'Marketer']);
    expect(records[0]).to.deep.equal({
      name: 'Operator',
      description: 'Changed by an administrator',
      tokens: ['custom-token', 'sales-channels-manager'],
      users: [10],
    });
    expect(records[1]).to.deep.equal({
      name: 'Marketer',
      description: 'Manages promotions',
      tokens: ['read-promotion-model'],
    });
  });
});
