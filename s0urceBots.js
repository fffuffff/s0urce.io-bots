const socket = require('socket.io-client')
// TODO Integrate the Solver module here and implement methods to interact with it

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
            // TODO Implement balance view
        }

            // General

        // Closing the game session
        die() {
            this.socket.disconnect()
            this.isOnline = false
        }

        // Method for getting class properties
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

        // The method that brings the bot into the game. The handler function is passed as a parameter.
        // which will be executed when the bot enters the game
        login(handler) {
            this.socket = socket('http://s0urce.io/')

            // Upon successful connection, we send a login request
            this.socket.once('connect', () => {            
                this.socket.emit('signIn', {
                    name: this.name
                })
            })

            // Upon receiving a response about a successful entry, remembering the id, we begin to remember the current data
            // and execute custom handler
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

        // Method receiving information about the player
        getTargetInfo(id, handler) {
            if (this.isOnline) {
                // We are trying to find out information about the player by id
                this.socket.emit('playerRequest', {
                    task: 105,
                    id: id
                })

                // When a response is received, call the handler
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

        // Method for checking if a player is online
        async isTargetOnline(id) {
            return new Promise((resolve, reject) => {
                if (this.isOnline) {
                    // We are trying to find out information about the player by id
                    this.socket.emit('playerRequest', {
                        task: 105,
                        id: id
                    })
    
                    // When we receive a response, we process it
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

        // Method for sending messages to other players
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

        // Method for getting the current list of players
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

        // Event that occurs when another player writes a message to the bot
        onMessage(handler) {
            this.socket.on('mainPackage', (response) => {
                response.unique.forEach(item => {
                    if (item.task == 2006) {
                        handler(item)
                    }
                })
            })
        }

        // Change the description in the game
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

            // Unraveling and word processing

        // Hack initiation
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
        
        // Events that occur when a new word is received for guessing
        onWordResolveRequest(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 333 || task.opt != 1) return
                    handler(task.url.t, task.url.i) 
                })
            })
        }

        // Sending a guessed word
        sendWord(word) {
            this.socket.emit('playerRequest', {
                task: 777,
                word: word
            })
        }

        // Successful guess event
        onWordSuccess(hander) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 333 || task.opt != 2) return
                    hander()
                })
            })
        }

        // Unsuccessful guess event
        onWordFail(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 333 || task.opt != 0) return
                    handler()
                })
            })
        }

        // Successful hack event
        onHackingSuccess(handler) {
            this.socket.on('mainPackage', (tasks) => {
                tasks.unique.forEach(task => {
                    if (task.task != 2003) return
                    if (task.text.slice(0, 22) != '<br>Hacking successful') return
                    handler()
                })
            })
        }

        // Failed hack event
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
