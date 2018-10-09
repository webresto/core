module.exports = function writeRevision(key, value) {
  SystemInfo.find().exec((err, si) => {
    if (err) return sails.log.error('si', err);

    const data = {};
    data[key] = value;

    if (!si[0]) {
      SystemInfo.create(data).exec(err => {
        if (err) return sails.log.error('si1', err);
        emit();
      });
    } else {
      SystemInfo.update({}, data).exec(err => {
        if (err) return sails.log.error('si2', err);
        emit();
      });
    }

    function emit() {
      sails.emit(key, value);
    }
  });
};
