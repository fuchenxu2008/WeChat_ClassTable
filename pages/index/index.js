//index.js
//获取应用实例
const app = getApp()
const io = require('../../npm/weapp.socket.io');
const config = require('../../config/index');

Page({

  data: {
    uname: '',
    psw: '',
    logged: false,
    remember: true,
    showManualModal: {
      showModal: 'hideModal',
      showMask: 'hideMask',
    }, 
    showContactModal: {
      showModal: 'hideModal',
      showMask: 'hideMask',
    }
  },

  handleUnameChange({ detail }) {
    this.setData({ uname: detail.value })
  },
  handlePswChange({ detail }) {
    this.setData({ psw: detail.value })
  },
  handleCheckboxChange({ detail }) {
    this.setData({ remember: !this.data.remember })
  },

  getClass(e) {
    const { uname, psw, remember } = this.data;
    const that = this;
    if (!this.WxValidate.checkForm(e)) {
      const error = this.WxValidate.errorList[0]
      wx.showToast({
        title: `${error.msg} `,
        icon: 'none',
        duration: 2000
      })
      return false;
    }

    const status = {
      '-1': 'Login Failed!',
      'Logging in...': 'Initiating...',
      '0': 'Logging ...',
      'Successfully logged in!': 'Logged in!',
      '-2': 'Register First!',
      '1': 'Fetching classes',
      'Got table': 'Success'
    };
    wx.showLoading({
      title: `Loading...`,
    })

    const progress = io(config.domain)
    const socketId = `${uname}_${Math.random() * 1000}`;
    progress.on(socketId, data => {
      wx.showLoading({
        title: `${status[data]}`,
      })
      if (data === '-1' || data === '-2' || data === 'Got table') {
        progress.close();
      }
    })
    wx.request({
      url: `${config.domain}/ebridge/class`,
      method: "POST",
      data: { uname, psw, socketId },
      success: res => {
        const classTable = res.data.rawClass;
        if (classTable) {
          if (remember) wx.setStorageSync('userCredential', { uname, psw });
          wx.setStorageSync('class', classTable)
          wx.hideLoading();
          that.setData({
            logged: true,
          });
          // redirect
          wx.switchTab({
            url: '../classpanel/classpanel'
          })
        } else {
          setTimeout(() => {
            wx.hideLoading()
          }, 2000);
        }
      }
    })
  },

  formSubmit: function(e) {
    const self = this;
    if (!self.data.remember) {
      wx.clearStorage();
      self.getClass(e);
    } else {
      const cachedUser = wx.getStorageSync('userCredential');
      if (cachedUser) {
        if (cachedUser.uname === self.data.uname) {
          wx.showModal({
            title: `Welcome back ${cachedUser.uname}`,
            content: 'It seems you have logged in before, go directly to your calendar?',
            success: function (res) {
              if (res.confirm) {
                wx.switchTab({
                  url: '../classpanel/classpanel'
                })
              } else if (res.cancel) self.getClass(e);
            }
          })
        } else self.getClass(e);
      } else self.getClass(e);
    }
  },

  showManualModal: function (e) {
    var that = this;
    that.setData({
      showManualModal: {
        showModal: 'showModal',
        showMask: 'showMask',
      }
    })
  },

  hideManualModal: function (e) {
    var that = this;
    that.setData({
      showManualModal: {
        showModal: 'hideModal',
        showMask: 'hideMask',
      },
    })
  },

  showContactModal: function (e) {
    var that = this;
    that.setData({
      showContactModal: {
        showModal: 'showModal',
        showMask: 'showMask',
      }
    })
  },

  hideContactModal: function (e) {
    var that = this;
    that.setData({
      showContactModal: {
        showModal: 'hideModal',
        showMask: 'hideMask',
      },
    })
  },

  copyEmail: function () {    
    wx.setClipboardData({
      data: 'fuchenxu2008@163.com',
      success: function (res) {
        wx.showToast({
          title: 'Email copied',
          icon: 'success',
          duration: 2000
        })
      }
    })
  },

  copyWeChat: function () {
    wx.setClipboardData({
      data: 'fuchenxu2008',
      success: function (res) {
        wx.showToast({
          title: 'WeChat copied',
          icon: 'success',
          duration: 2000
        })
      }
    })
  },

  copyWeb: function () {
    wx.setClipboardData({
      data: config.domain,
      success: function (res) {
        wx.showToast({
          title: 'Url copied',
          icon: 'success',
          duration: 2000
        })
      }
    })
  },

  onShareAppMessage: function (res) {
    return {
      title: 'ClassTable for XJTLU',
      path: 'pages/index/index',
    }
  },

  openMapApp: () => wx.navigateToMiniProgram({
    appId: "wxf668a17a33aa0527"
  }),

  //事件处理函数
  onLoad: function () {
    this.WxValidate = app.wxValidate({
      uname: { required: true },
      psw: { required: true }
    }, {
        uname: { required: 'Enter your username!' },
        psw: { required: 'Enter your password!' },
    })

    const user = wx.getStorageSync('userCredential');
    if (user) {
      this.setData({
        uname: user.uname,
        psw: user.psw
      });

      if (wx.getStorageSync('class')) {
        this.setData({
          logged: true,
        });
        wx.switchTab({
          url: '../classpanel/classpanel'
        })
      }
    }
  },
})
