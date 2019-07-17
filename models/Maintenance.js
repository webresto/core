module.exports = {
  attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      autoIncrement: true
    },
    title: 'string',
    description: 'string',
    enable: {
      type: 'boolean',
      defaultsTo: true
    },
    startDate: 'date',
    stopDate: 'date',
  }
};
