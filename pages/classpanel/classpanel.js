//index.js
//获取应用实例
const app = getApp()
const numberRange = require('../../utils/util').numberRange;
const moment = require('../../npm/moment/moment');
const io = require('../../npm/weapp.socket.io');
const config = require('../../config/index');
import Calendar from '../../components/calendar/calendar'

moment.locale('zh-cn', {
    week: {
        dow: 1 // Monday is the first day of the week
    }
});

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

Page({

    data: {
        listHeight: '800',
        classTable: {},
        classesOflastDay: [],
        classesOfDay: [],
        classesOfNextDay: [],
        selected_date: moment().format("YYYY-MM-DD"),
        selected_week: 0,
        selected_weekDay: weekDays[moment().isoWeekday() - 1],
        activeIndex: 1,
    },

    getWeek() {
        const termStart = moment(config.termStart, "YYYY-MM-DD");
        const selectedDay = moment(this.data.selected_date);
        const actualWeek = Math.floor(selectedDay.diff(termStart, 'days') / 7) + 1;
        return actualWeek;
    },

    getInterval(period) {
        const intervals = period.split(':')[1].split(',').map(interval => interval.trim());
        let intervalDict = {};
        intervals.forEach(interval => {
            const startEnd = interval.split('-');
            const start = startEnd[0];
            if (startEnd.length > 1) {
                intervalDict[start] = startEnd[1];
            } else {
                intervalDict[start] = start;
            }
        });
        let intervalScope = [];
        Object.keys(intervalDict).forEach(start => {
            intervalScope = intervalScope.concat(numberRange(parseInt(start, 10), parseInt(intervalDict[start], 10) + 1));
        });
        return intervalScope;
    },

    getClassesOfDay(date) {        
        const { classTable } = this.data;
        const week = this.getWeek();

        let classesOfDay = [];
        if (week.toString() in config.holidays.weeks) {
            classesOfDay.push({
                holiday: config.holidays.weeks[week.toString()]
            });
        } else if (moment(date).format("YYYY-MM-DD") in config.holidays.days) {
            classesOfDay.push({
                holiday: config.holidays.days[moment(date).format("YYYY-MM-DD")]
            });
        } else {
            // Monday 0 -- Friday 4
            Object.keys(classTable).forEach((weekDay, index) => {
                if (index === moment(date).weekday()) {
                    classesOfDay = classTable[weekDay].classes;
                }
            });
            classesOfDay = classesOfDay.filter(Class => {
                return this.getInterval(Class.period).indexOf(week) !== -1;   // Potential error
            })
        }
        return classesOfDay;
    },

    getClassLists() {
        this.setData({
            classesOflastDay: this.getClassesOfDay(moment(this.data.selected_date).add(-1, 'days').format("YYYY-MM-DD")),
            classesOfDay: this.getClassesOfDay(moment(this.data.selected_date).format("YYYY-MM-DD")),
            classesOfNextDay: this.getClassesOfDay(moment(this.data.selected_date).add(1, 'days').format("YYYY-MM-DD")),
            selected_week: this.getWeek(),
            selected_weekDay: weekDays[moment(this.data.selected_date).isoWeekday() - 1],
            activeIndex: 1,
        })
    },

    refreshClass() {
        const self = this;
        const cachedUser = wx.getStorageSync('userCredential');
        if (cachedUser) {
            const { uname, psw } = cachedUser;
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
                });
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
                        wx.setStorageSync('class', classTable);
                        self.setData({ classTable })
                        wx.hideLoading()
                        wx.showToast({
                            title: 'Success',
                            icon: 'success',
                            duration: 2000
                        })
                    } else {
                        wx.hideLoading()
                        wx.showModal({
                            title: 'Error',
                            content: 'Fail to login, re-enter your credentials?',
                            success: function (res) {
                                if (res.confirm) {
                                    wx.switchTab({
                                        url: '../index/index'
                                    })
                                }
                            }
                        })
                    }
                }
            })
        }
    },

    openCalendar() {
        if (this.date) {
            return this.date.show()            
        }
        const self = this;

        this.date = Calendar.init('date', {
            value: [`${this.data.selected_date}`],
            onChange(p, v, d) {
                self.setData({
                    selected_date: d.join(', ')
                })
                self.getClassLists();
            }
        })
    },

    onPullDownRefresh: function () {
        const self = this;
        wx.showModal({
            title: 'Refresh your classTable?',
            content: 'This will re-fetch your classes from E-bridge. May take 8-15 seconds.',
            success: function (res) {
                if (res.confirm) {
                    self.refreshClass();
                } else wx.stopPullDownRefresh();
            }
        })
    },

    changeswiper: function (e) {
        var index = e.detail.current;//当前所在页面的 index
        
        if (index > this.data.activeIndex) {//左滑事件判断-下一天
            this.setData({
                selected_date: moment(this.data.selected_date).add(1, 'days').format("YYYY-MM-DD")
            }, () => {
                this.getClassLists();
            })  
        } else if (index < this.data.activeIndex) {//右滑事件判断-上一天
            this.setData({
                selected_date: moment(this.data.selected_date).add(-1, 'days').format("YYYY-MM-DD")
            }, () => {
                this.getClassLists();
            }) 
        }
    },

    onShareAppMessage: function (res) {
      return {
        title: 'ClassTable for XJTLU',
        path: 'pages/index/index',
      }
    },

    //事件处理函数
    onLoad: function () {
        const classTable = wx.getStorageSync('class');
        if (classTable) {
          this.setData({ classTable });
          this.getClassLists();
        }  
        const self = this;
        wx.getSystemInfo({
            success: function (res) {
                self.setData({
                    listHeight: res.windowHeight - 182
                })
            }
        })
    },

    onShow: function () {
        const storageClassTable = wx.getStorageSync('class');
        if (storageClassTable) {
            const { classTable } = this.data;
            if (classTable) {
                if (classTable !== storageClassTable) {
                    this.setData({ classTable: storageClassTable });
                    this.getClassLists();
                }
            }
        } else {
          this.setData({ classTable: {} });
          this.getClassLists();
        }
    }
})
