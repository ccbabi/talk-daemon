const fs = require('fs')
const path = require('path')
const createHandler = require('node-gitlab-webhook')
const Pea = require('pea-js').default
const execa = require('execa')

const repositoryPath = '/Users/wangjie/com/static_assets'
const handler = createHandler([
  { path: '/webhook/static_assets', secret: 'talk-daemon' }
])

handler.on('merge_request', function (e) {
  const pea = new Pea()
  const objectAttributes = e.payload.object_attributes

  pea.use(next => {
    // 非merged， 跳过
    console.log(`事件：${objectAttributes.state}`)
    if (objectAttributes.state !== 'merged') return

    // 更新仓库
    const result = execa.sync('git', ['pull'], { cwd: repositoryPath })
    console.log(result.stdout)
    next()
  }).use(next => {
    let matchs, projectPath

    // 没有注释，跳过
    console.log(`注释: ${objectAttributes.description}`)
    if (!objectAttributes.description.trim()) return

    // 没有注释build信息，跳过
    matchs = objectAttributes.description.match(/\s*@build\s+(\w+)\/(\w+)\b/)
    if (!matchs) return

    // build信息不正确，跳过
    projectPath = path.resolve(repositoryPath, matchs[1], matchs[2])
    console.log(projectPath)
    console.log(fs.existsSync(projectPath))
    if (!fs.existsSync(projectPath)) return

    // 安装依赖
    console.log('开始安装依赖')
    const result = execa.sync('npm', ['install', '--production', '--registry=https://registry.npm.taobao.org'], { cwd: projectPath })
    console.log(result)
    next(projectPath)
  })
  .use((projectPath, next) => {
    // 执行打包
    console.log('开始打包')
    const result = execa.sync('talk', ['build'], { cwd: projectPath })
    if (!result.code) {
      console.log('打包完成')
    }
  }).start()
})

handler.on('error', function (err) {
  console.error('Error:', err.message)
})

module.exports = handler
