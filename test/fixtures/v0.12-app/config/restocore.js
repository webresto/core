module.exports.restocore = {
  project: "Test",
  project_slug: "test",  
  timeSyncBalance: 30, // seconds
  timeSyncMenu: 5 * 60 , // seconds
  timeSyncStreets: 12, // hours
  images: {
    adapter: 'imagemagick-local',
    dish: {
      format: 'png',
      path: '/images',
      resize: {
        small: {
          width: 200,
          height: 200
        },
        large: {
          width: 600
        }
      }
    },
    group: {
      format: 'png',
      path: '/imagesG',
    }
  },
  development: true,
  masterKey: 'test',
  city: 'Xlan',
  defaultName: "name",
  defaultNumber: "77777777777",
  timezone: 'Asia/Yekaterinburg',
  timeSyncMap: 15 * 60, //seconds
  checkType: 'native', //'rms',
  groupShift: '',
};
