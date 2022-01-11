module.exports.models = {
   migrate: 'drop',
   attributes: {
      // @webresto/core required autocreate time points
      createdAt: { type: 'number', autoCreatedAt: true, },
      updatedAt: { type: 'number', autoUpdatedAt: true, }
    }
};