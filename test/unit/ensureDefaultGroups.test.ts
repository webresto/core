import { expect } from 'chai';
import { ensureDefaultGroups } from '../../libs/adminpanel/ensureDefaultGroups';

describe('ensureDefaultGroups', function () {
  it('creates only groups that do not exist', async function () {
    const records: any[] = [
      {
        name: 'Operator',
        description: 'Changed by an administrator',
        tokens: ['custom-token'],
        users: [10],
      },
    ];
    const groupModel = {
      findOne: async ({ where }: any) => records.find((record) => record.name === where.name),
      create: async (record: any) => {
        records.push(record);
        return record;
      },
    };
    const adminizer = {
      modelHandler: {
        internal: () => ({ get: () => groupModel }),
      },
    };

    await ensureDefaultGroups(adminizer, [
      {
        name: 'Operator',
        description: 'Processes and updates current orders',
        tokens: ['order-kanban'],
      },
      {
        name: 'Marketer',
        description: 'Manages promotions',
        tokens: ['read-promotion-model'],
      },
    ]);

    expect(records).to.have.length(2);
    expect(records[0]).to.deep.equal({
      name: 'Operator',
      description: 'Changed by an administrator',
      tokens: ['custom-token'],
      users: [10],
    });
    expect(records[1]).to.deep.equal({
      name: 'Marketer',
      description: 'Manages promotions',
      tokens: ['read-promotion-model'],
    });
  });
});
