module.exports = function writeRevision(key, value) {
  SystemInfo.findOneByKey(key).exec((err, si) => {
    if (err) return sails.log.error('si', err);

    const data = {};
    data.key = key;
    data.value = value;

    if (!si) {
      SystemInfo.create(data).exec(err => {

        if (err) return sails.log.error('si1', err);
        emit();
      });
    } else {
      SystemInfo.findOne({key: key}).exec((err, si) => {
        if (err) return sails.log.error('si2', err);

        si.value = value;
        // sails.log.info('si', si);
        si.save(err => {
          if (err) return sails.log.error('si3', err);

          emit();
        });
      });
    }

    function emit() {
      sails.emit(key, value);
    }
  });
};
