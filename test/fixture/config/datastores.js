function setDatastore(datastore) {
  switch (datastore) {
    ///////////////////////////////////////////////////
    case "postgres":

      // define VARs
      var PG_PORT = process.env.PG_PORT === undefined ? 5432 : process.env.PG_PORT;
      var PG_DATABASE = process.env.PG_DATABASE === undefined ? "postgres" : process.env.PG_DATABASE;
      var PG_HOST = process.env.PG_HOST === undefined ? "postgres" : process.env.PG_HOST;

      var PGLINK; if (process.env.PGLINK === undefined) PGLINK = process.env.PGLINK;
      if (!PGLINK) {
        if(process.env.PG_USER){
          PGLINK = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
        }else{
          PGLINK = `postgresql://postgres:postgres@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
        }
      }

      return {
        adapter: 'sails-postgresql',
        url: PGLINK
      }

    ///////////////////////////////////////////////////
    default:
      return {}
  }

}


let datastores = {
  default: {
    adapter: "sails-disk",
    inMemoryOnly: true
  }
}

if (process.env.DATASTORE){
  datastores["default"] = setDatastore(process.env.DATASTORE)
  // datastores[process.env.DATASTORE] = setDatastore(process.env.DATASTORE)
}

module.exports.datastores =  datastores 