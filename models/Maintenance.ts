module.exports = {
  attributes: {
    id: {
      type: 'string',
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
    stopDate: 'date'
  }
};

export default interface Maintenance {
  id: number;
  title: string;
  description: string;
  enable: boolean;
  startDate: string;
  stopDate: string;
}
