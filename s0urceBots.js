const socket = require('socket.io-client')
// TODO Интегрировать модуль Solver сюда и реализовать методы для взаимодействия с ним

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
            this.name = name
            this.isOnline = false
            // TODO Реализовать просмотр баланса
        }

            // Общее

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

        sendAfterHackingMsg(msg) {
            this.socket.emit('playerRequest', {
                task: 106,
                text: msg
            })
        }

            // Разгадывание и обработка слов

        // Инициация взлома
        startHacking(id, port = 0, callback = () => {}) {
            if (!this.isOnline) return
            this.socket.emit('playerRequest', {
                task: 100,
                id: id,
                port: port
            })

            this.socket.once('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 2002) return
                    callback()
                })
            })
        }
        
        // Событие, происходящие при получении нового слова на разгадывание
        onWordResolveRequest(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 333 || task.opt != 1) return
                    handler(task.url.t, task.url.i) 
                })
            })
        }

        // Отправка разгаданного слова
        sendWord(word) {
            this.socket.emit('playerRequest', {
                task: 777,
                word: word
            })
        }

        // Событие успешного разгадывания
        onWordSuccess(hander) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 333 || task.opt != 2) return
                    hander()
                })
            })
        }

        // Событие неудачного разгададывания
        onWordFail(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 333 || task.opt != 0) return
                    handler()
                })
            })
        }

        // Событие успешного взлома
        onHackingSuccess(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 2003) return
                    if (task.text.slice(0, 22) != '<br>Hacking successful') return
                    handler()
                })
            })
        }

        // Событие неудачного взлома
        onHackingFail(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    // TODO Реализовать передачу типы возникнувшей ошибки
                    if (task.task != 2003) return
                    if (task.text.slice(0, 22) == '<br>Hacking successful') return
                    handler(task.text)
                })
            })
        }
    }
}