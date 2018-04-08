const app = require('express')()
const webhook = require('./middleware/webhook')

app.use(webhook)

app.listen(5445)
