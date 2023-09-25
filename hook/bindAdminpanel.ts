import settings from "../libs/adminpanel/model/settings"
export default function bindAdminpanel () {
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
    processBindAdminpanel()
  })
}


function processBindAdminpanel(){
  if(sails.hooks?.adminpanel?.addModelConfig !== undefined) {
    const addModelConfig = sails.hooks.adminpanel.addModelConfig;
    addModelConfig(settings);
  }
}


