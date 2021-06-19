//#region requirements
const Discord = require('discord.js');
require('dotenv').config();

const MusicManager = require('music-manager');
//#endregion

//#region client and global variables declaratoin
/**discord client
 * @type {Discord.Client}
 */
const client = new Discord.Client();

const dj = new MusicManager();
//#endregion

client.once('ready', () => {
    console.log('봇이 켜졌습니다.');
    client.user.setActivity("#p [곡 이름]", { type: 2 });
})

client.on('message', async (message) => {
    if (message.channel.type == 'dm') return;
    if (!message.content.startsWith(process.env.COMMANDPREFIX)) return;

    const msg = message.content.substring(1).trim().replace(/[ ]+/g, ' ');
    const sender = message.author.username;
    const id = message.author.id;
    const server = message.guild.name;

    const command = msg.split(' ')[0].trim().toLowerCase();
    const query = msg.substring(command.length).trim();
    let params = [];
    if (query && query.length > 0) params = query.split(' ');

    let r;

    switch (command) {
        case 'join':
        case 'j':
        case '돌아와':
        case '들어와':
        case '와':
            await dj.join(message).then(r => {

            }).catch(e => {

            });
            break;

        case '재생':
        case 'p':
        case 'play':
            r = await dj.play(query, message).catch(e => {
                console.error(e);
                message.channel.send(new Discord.MessageEmbed({
                    title: '⚠ 오류 ⚠',
                    description: `${message.author} 해당하는 영상을 찾지 못했어요!`,
                    color: '#ff0000'
                }));
            });

            if (!r) break;

            if (r.add) {
                message.channel.send(new Discord.MessageEmbed({
                    title: '🎶 곡 추가 🎶',
                    description: `${r.music.requester}\n대기열: ${r.index}\n제목: [${r.music.info.title}](${r.music.url})\n길이: ${r.music.info.duration}\n게시자: ${r.music.info.author}`,
                    image: { url: r.music.info.thumbnail },
                    color: '#9400D3'
                }));
            } else if (r.error) {
                message.channel.send(new Discord.MessageEmbed({
                    title: '⚠ 오류 ⚠',
                    description: `${message.author} ${r.error}`,
                    color: '#ff0000'
                }));
            } else {
                message.channel.send(new Discord.MessageEmbed({
                    title: '🎶 곡 재생 🎶',
                    description: `${r.requester}\n[${r.info.title}](${r.url})\n길이: ${r.info.duration}\n게시자: ${r.info.author}`,
                    image: { url: r.info.thumbnail },
                    color: '#9400D3'
                }));
            }
            break;

        case '삭제':
        case '제거':
        case 'd':
        case 'r':
        case 'remove':
        case 'delete':
            r = await dj.remove(query, message).catch(e => {
                message.channel.send(new Discord.MessageEmbed({
                    title: '⚠ 오류 ⚠',
                    description: `${message.author} 해당하는 곡을 삭제 할 수 없습니다.`,
                    color: '#ff0000'
                }));
            });

            if (!r) message.channel.send(new Discord.MessageEmbed({
                title: '⚠ 오류 ⚠',
                description: `${message.author} 해당하는 곡을 삭제 할 수 없습니다.`,
                color: '#ff0000'
            }));
            else message.channel.send(new Discord.MessageEmbed({
                title: '🗑 곡 삭제 🗑',
                description: `${message.author}\n\`${r.info.title}\` 제거`,
                color: '#9400D3'
            }));
            break;

        case '추가':
        case 'add':
        case 'a':
            r = await dj.add(query, message).catch(e => {
                console.error(e);
                message.reply(`⚠ ${message.authro} 오류 ⚠`)
            });

            if (r.add) {
                message.channel.send(new Discord.MessageEmbed({
                    title: '🎶 곡 추가 🎶',
                    description: `${message.author}\n대기열: ${r.index}\n제목: [${r.music.info.title}](${r.music.url})\n길이: ${r.music.info.duration}\n게시자: ${r.music.info.author}`,
                    image: { url: r.music.info.thumbnail },
                    color: '#9400D3'
                }));
            } else if (r.error) {
                message.channel.send(new Discord.MessageEmbed({
                    title: '⚠ 오류 ⚠',
                    description: `${message.author} ${r.error}`,
                    color: '#ff0000'
                }));
            } else {
                message.channel.send(new Discord.MessageEmbed({
                    title: '⚠ 오류 ⚠',
                    description: `${message.author} 해당 곡은 이미 목록에 존재합니다.`,
                    color: '#ff0000'
                }));
            }
            break;

        case '스킵':
        case 'skip':
        case 's':
            dj.skip(message);
            break;

        case 'test':
            message.channel.send(new Discord.MessageEmbed({
                type: 'rich',
                title: '🎶 곡 재생 🎶',
                description: '<@717419863177691267>\n' +
                    '[Ep 4. TWICE is TWICE | TWICE: Seize the Light](https://youtube.com/watch?v=rFxaGZ9xMPg)\n' +
                    '길이: 00:17:03\n' +
                    '게시자: TWICE',
                url: null,
                color: 9699539,
                timestamp: null,
                fields: [],
                thumbnail: null,
                image: {
                    url: 'https://i.ytimg.com/vi/rFxaGZ9xMPg/hq720.jpg',
                    proxyURL: undefined,
                    height: undefined,
                    width: undefined
                },
                video: null,
                author: null,
                provider: null,
                footer: null,
                files: []
            }));
            break;

        case '목록':
        case 'queue':
        case 'q':
            r = await dj.view(message);
            if (r.trim().length === 0) {
                r = '재생 목록이 비었습니다.';
            }
            message.channel.send(new Discord.MessageEmbed({
                title: '🎶 재생 목록 🎶',
                description: `\`\`\`\n${r}\n\`\`\``,
                color: '#9400D3'
            }));
            break;

        case 'np':
        case '곡':
        case 'nowplaying':
        case 'now':
            r = await dj.np(message);
            if (!r || !r.music.info) message.channel.send(new Discord.MessageEmbed({
                title: '🤔 흐으음... 🤔',
                description: `${message.author} 재생 중이 아닙니다.`,
                color: '#ff0000'
            }));
            else message.channel.send(new Discord.MessageEmbed({
                title: '🎶 재생 중 🎶',
                description: `${r.music.requester}\n[${r.music.info.title}](${r.music.url})\n재생: ${r.time}/${r.music.info.duration}\n게시자: ${r.music.info.author}`,
                image: { url: r.music.info.thumbnail },
                color: '#9400D3'
            }));
            break;

        case 'stop':
        case '중지':
        case '정지':
            // 미완
            break;
    }
});

client.login(process.env.TOKEN);