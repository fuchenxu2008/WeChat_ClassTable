//app.js
import wxValidate from 'utils/wxValidate'

App({
  onLaunch: function () {
    
  },
  
  wxValidate: (rules, messages) => new wxValidate(rules, messages),

  globalData: {
    
  },
})