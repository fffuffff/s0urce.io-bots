const socket = require('socket.io-client')

module.exports = {
    bot: class {
        constructor (name) {
            this.id = undefined
            this.desc = undefined
            this.level = undefined
            this.rank = undefined
            this.achievmentRank = undefined
            this.comments = {
                first: undefined,
                second: undefined
            }
            this.name = name // Даем имя боту, которое будет отображаться в игре
            this.isOnline = false
        }

        // Закрытие игровой сессии
        die() {
            this.socket.disconnect()
            this.isOnline = false
        }

        // Метод для получения свойств класса
        async getProperties() {
            return new Promise((resolve, reject) => {
                this.socket.once('mainPackage', (tasks) => {
                    tasks.unique.forEach(task => {
                        if (task.task != 2008) return
                        task.data.forEach(item => {
                            if (item.id != this.id) return
                            resolve(this)
                        })
                    })
                })
            })
        }

        // Метод вводящий бота в игру. В качестве параметра передается функция обработчик
        // которая будет выполнена когда бот зайдет в игру
        login(handler) {
            this.socket = socket('http://s0urce.io/')

            // При успешном подключении, отправляем запрос на вход
            this.socket.once('connect', () => {            
                this.socket.emit('signIn', {
                    name: this.name
                })
            })

            // При получении ответа об удачном входе, запоминеам ид, начинаем запоминать текущие данные
            // и выполняем пользовательский обработчик
            this.socket.once('prepareClient', (data) => {
                this.id = data.id
                this.socket.on('mainPackage', (tasks) => {
                    tasks.unique.forEach(task => {
                        if (task.task != 2008) return
                        task.data.forEach(item => {
                            if (item.id != this.id) return
                            this.level = item.level
                            this.desc = item.desc
                            this.comments = item.comm
                            this.rank = item.rank
                            this.achievmentRank = item.achievmentRank
                            this.isOnline = true
                        })
                    })
                })
                this.socket.once('mainPackage', (tasks) => {
                    tasks.unique.forEach(task => {
                        if (task.task != 2008) return
                        handler()
                    })
                })
            })
        }

        // Метод получающий информацию об игроке
        getTargetInfo(id, handler) {
            if (this.isOnline) {
                // Пытаемся узнать информацию о игроке по ид
                this.socket.emit('playerRequest', {
                    task: 105,
                    id: id
                })

                // При получении ответа вызываем обработчик
                this.socket.once('mainPackage', (response) => {
                    response.unique.forEach(item => {
                        switch (item.task) {
                            case 2007:
                                handler({
                                    isOnline: true,
                                    data: item.data
                                })
                                break
                            
                            case 2000:
                                if (item.data.type == 2) {
                                    handler({
                                        isOnline: false,
                                    })
                                }
                                break
                        }
                    })
                })
            }
        }

        // Метод для проверки находитс ли игрок в сети
        async isTargetOnline(id) {
            return new Promise((resolve, reject) => {
                if (this.isOnline) {
                    // Пытаемся узнать информацию о игроке по ид
                    this.socket.emit('playerRequest', {
                        task: 105,
                        id: id
                    })
    
                    // При получении ответа обрабатываем его
                    this.socket.once('mainPackage', (response) => {
                        response.unique.forEach(item => {
                            switch (item.task) {
                                case 2007:
                                    resolve()
                                    break
                                
                                case 2000:
                                    if (item.data.type == 2) {
                                        reject({
                                            status: 'offline'
                                        })
                                    }
                                    break
                            }
                        })
                    })
                } else {
                    throw new Error('Bot is offline')
                }
            })
        }

        // Метод для отправли сообщений другим игрокам
        sendMessage(id, msg, onError = () => {}) {
            this.isTargetOnline(id)
            .then(
                () => {
                    this.socket.emit('playerRequest', {
                        task: 300,
                        id: id,
                        message: msg
                    })
                },

                () => {
                    onError()
                }
            )
        }

        // Метод для получения текущего списка игроков
        async getTargetList() {
            return new Promise((resolve) => {
                if (this.isOnline) {
                    this.socket.once('mainPackage', (response) => {
                        response.unique.forEach(item => {
                            if (item.task == 2008) {
                                resolve({
                                    data: item.data,
                                    topFive: item.topFive
                                })
                            }
                        })
                    })
                }
            })
        }

        // Событие, происходящее при написании сообщения боту другим игроком
        onMessage(handler) {
            this.socket.on('mainPackage', (response) => {
                response.unique.forEach(item => {
                    if (item.task == 2006) {
                        handler(item)
                    }
                })
            })
        }

        // Смена описания в игре
        changeDesc(desc, callback = () => {}) {
            if (!this.isOnline) return
            this.socket.emit('playerRequest', {
                task: 104,
                desc: desc
            })

            this.socket.once('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 2009) return
                    callback()
                })
            })
        }
    }
}