//#region requirements
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const Discord = require('discord.js');
//#endregion

function two(n) {
    if (n < 10) return '0' + n;
    return n + '';
}

function three(n) {
    if (n < 10) return '00' + n;
    if (n < 100) return '0' + n;
    return n + '';
}

function toTime(s) {
    s = s | 0;
    let h, m;
    h = (s / 3600) | 0;
    s %= 3600;
    m = (s / 60) | 0;
    s %= 60;

    return `${two(h)}:${two(m)}:${two(s)}`
}

async function newMusic(text, requester) {
    let result = await yts(text);
    // 결과 비디오가 없음
    if (result.videos.length === 0) {
        throw new Error('no-video');
    } else {
        return new Music({
            title: result.videos[0].title.replace(/\"|\'|\`/g, ''),
            description: result.videos[0].description.replace(/\"|\'|\`/g, ''),
            duration: toTime(result.videos[0].duration.seconds),
            author: result.videos[0].author.name.replace(/\"|\'|\`/g, ''),
            url: result.videos[0].url.replace(/\"|\'|\`/g, ''),
            thumbnail: result.videos[0].thumbnail.replace(/\"|\'|\`/g, ''),
        }, requester);
    }
}

/**음악 클래스
 * @typedef {object} Music
 * @property {stirng} Music.url
 * @property {string} Music.type 사클, 유튭 구분
 * @property {string} Music.requester 요청자
 * @property {object} Music.info
 * @property {string} Music.info.title
 * @property {string} Music.info.description
 * @property {string} Music.info.duration
 * @property {string} Music.info.author
 * @property {string} Music.info.url
 * @property {string} Music.info.thumbnail
 */
class Music {
    /**Music constructer
     * @param {object} info
     */
    constructor(info, requester) {
        this.requester = requester;
        this.info = info
        this.url = info.url
    }
}

/**서버
 * @typedef {Object} Server
 * @property {Music[]} Server.queue 음악 큐
 * @property {Music} Server.playing 현재 재생 중인 음악
 * @property {object} Server.broadcast 보이스 연결
 */
class Server {
    constructor() {
        /**음악 큐
         * @type {Music[]} */
        this.queue = [];
        /**현재 재생 중인 음악 
         * @type {Music} */
        this.playing = null;
        /**보이스 연결 */
        this.broadcast = null;
        /**스트림 */
        this.stream = null;
    }

    exists(music) {
        return !(this.queue.every((e) => {
            return e.url !== music.url;
        }));
    }

    play(music, message) {
        if (this.playing !== null) {
            return false;
        }
        this.playing = music;

        this.stream = this.broadcast.play(
            ytdl(music.url, {
                quality: 'highestaudio',
                highWaterMark: 1024 * 1024 * 20,
                retries: 5
            })
        ).on('finish', () => {
            this.playing = null;
            this.next(message);
        }).on('error', e => {
            message.channel.send(new Discord.MessageEmbed({
                title: '⚠ 오류 ⚠',
                description: `${this.playing.requester}\n노래를 재생 하지 못했습니다.\n미안해요!`,
                color: '#ff0000'
            }));
            this.playing = null;
            this.next(message);
        });

        return this.playing;
    }

    /**
     * 
     * @param {Discord.Message} message 
     * @returns 
     */
    next(message) {
        this.stream.destroy();
        this.stream = null;
        if (this.queue.length > 0 && this.playing === null) {
            if (!this.play(this.queue[0], message)) {
                message.channel.send(new Discord.MessageEmbed({
                    title: '⚠ 오류 ⚠',
                    description: `${this.playing.author} 재생 실패`,
                    color: '#ff0000'
                }));

                return true;
            }

            this.queue.splice(0, 1);
            message.channel.send(new Discord.MessageEmbed({
                title: '🎶 곡 재생 🎶',
                description: `${String(this.playing.requester)}\n[${this.playing.info.title}](${this.playing.url})\n길이: ${this.playing.info.duration}\n게시자: ${this.playing.info.author}`,
                image: { url: this.playing.info.thumbnail },
                color: '#9400D3'
            })).catch(e => {
                console.log(new Discord.MessageEmbed({
                    title: '🎶 곡 재생 🎶',
                    description: `${this.playing.requester}\n[${this.playing.info.title}](${this.playing.url})\n길이: ${this.playing.info.duration}\n게시자: ${this.playing.info.author}`,
                    image: { url: this.playing.info.thumbnail },
                    color: '#9400D3'
                }));
            });

            return this.playing;
        }

        return false;
    }

    add(music) {
        if (this.exists(music)) {
            return {
                'error': '해당 곡은 추가 할 수 없습니다.'
            };
        }

        this.queue.push(music);

        return {
            add: true,
            index: this.queue.length,
            music: music
        };
    }

    remove(index) {
        if (!this.queue[index - 1]) return false;
        let d = this.queue[index - 1];
        this.queue.splice(index - 1, 1);

        return d;
    }

    view() {
        return this.queue.slice(0, 10).map((e, i) => `${three(i + 1)} | ${e.info.title.length > 34 ? e.info.title.substring(0, 31) + '...' : e.info.title} | ${e.info.duration}`).join('\n');
    }

    np() {
        if (this.playing === null || !this.broadcast) return false;
        return {
            time: toTime(this.broadcast.dispatcher.streamTime / 1000),
            music: this.playing
        };
    }
}

/**음악 관리자 클래스
 * @typedef {object} MusicManager
 * @property {object<Server>} MusicManager.servers
 */
class MusicManager {
    /**MusicManager Constructer
     * @constructor
     * @param {*} client 
     */
    constructor() {
        // 서버들
        this.servers = {};
    }

    /**기본 서버 체킹
     * @private
     * @param {string} serverName
     */
    ServerCheck(serverName) {
        // 서버가 존재 하지 않으면 생성
        if (!this.servers[serverName]) {
            this.servers[serverName] = new Server;
        }
    }

    async join(message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        server.broadcast = await message.member.voice.channel.join();
    }

    /**재생
     * @param {string} msg 영상 주소 또는 검색어
     * @param {object} message 디스코드 메시지 객체
     * @returns {boolean} 문제 없으면 true, 에러 발생시 false를 반환
     */
    async play(msg, message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        let music = await newMusic(msg.trim(), message.author).catch(e => {
            throw new Error('no-video');
        });

        // 서버에 broadcast가 없다면 생성
        if (server.broadcast === null) {
            try {
                server.broadcast = await message.member.voice.channel.join();
            } catch (e) {
                console.error(e);
                message.channel.send(new Discord.MessageEmbed({
                    title: '🤔 흐으음 🤔',
                    description: '보이스 채널에 들어가 있지 않아요.',
                    color: '#ff0000'
                }));
                return false;
            }
        }

        if (server.broadcast !== null && !server.play(music, message)) {
            return server.add(music);
        }

        return music;
    }

    async add(msg, message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        let music = await newMusic(msg.trim(), message.author).catch(e => {
            throw new Error('no-video');
        });

        return server.add(music);
    }

    async remove(msg, message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        return server.remove(msg * 1);
    }

    async np(message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        return server.np();
    }

    async skip(message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        if (server.playing === null) return false;

        server.playing = null;
        message.react('⏩');

        server.next(message);

        return true;
    }

    async view(message) {
        /**@type {string}*/
        const serverName = message.guild.name;
        this.ServerCheck(serverName);

        /**@type {Server} */
        const server = this.servers[serverName];

        return server.view();
    }
}

module.exports = MusicManager;